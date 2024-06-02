/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Configuration, PlaidApi, PlaidEnvironments, Products } from 'plaid';

// Initialize Firebase Admin
admin.initializeApp();

// Plaid client setup
const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': 'YOUR_PLAID_CLIENT_ID',
            'PLAID-SECRET': 'YOUR_PLAID_SECRET',
        },
    },
});

const client = new PlaidApi(configuration);
// Firestore reference
const db = admin.firestore();

exports.createPublicTokens = functions.https.onRequest(async (req, res) => {
    const institutionIds = ['ins_56', 'ins_127989', 'ins_128026']; // Replace these with actual Sandbox institution IDs
    const initialProducts = [Products.Transactions]; // Products you plan to use; adjust as needed

    try {
        // Step 1: Clear existing tokens from Firestore
        const tokensSnapshot = await db.collection('publicTokens').get();
        const batch = db.batch();
        tokensSnapshot.forEach(doc => {
            batch.delete(doc.ref); // Add each document to the batch delete
        });
        await batch.commit(); // Execute the batch delete

        for (const institutionId of institutionIds) {
            const response = await client.sandboxPublicTokenCreate({
                institution_id: institutionId,
                initial_products: initialProducts,
            });
            const newDocRef = db.collection('publicTokens').doc(); // Create a new document for each new token
            await newDocRef.set({ token: response.data.public_token });
        }

        // Respond with the array of generated public tokens
        res.status(200).send({ success: true, message: 'New public tokens generated and old tokens cleared.' });
    } catch (error) {
        console.error('Failed to create public tokens:', error);
        res.status(500).send('Failed to create public tokens');
    }
});

exports.exchangePublicTokensAndStore = functions.https.onRequest(async (req, res) => {
    try {
        // Step 1: Retrieve public tokens from Firestore
        const publicTokensSnapshot = await db.collection('publicTokens').get();
        const publicTokens: string[] = publicTokensSnapshot.docs.map(doc => doc.data().token);

        if (publicTokens.length === 0) {
            res.status(404).send({ error: 'No public tokens found in Firestore.' });
            return;
        }

        // Step 2: Clear existing access tokens from Firestore
        const accessTokensSnapshot = await db.collection('accessTokens').get();
        const batchDelete = db.batch();
        accessTokensSnapshot.forEach(doc => {
            batchDelete.delete(doc.ref); // Queue each document for deletion
        });
        await batchDelete.commit(); // Execute the batch deletion

        // Step 3: Exchange each public token for an access token and store them
        const batchStore = db.batch();
        for (const publicToken of publicTokens) {
            const response = await client.itemPublicTokenExchange({ public_token: publicToken });
            const accessToken = response.data.access_token;
            
            const newDocRef = db.collection('accessTokens').doc(); // Create a new document for each access token
            batchStore.set(newDocRef, { accessToken: accessToken });
        }
        await batchStore.commit(); // Store all new access tokens in Firestore

        res.status(200).send({ success: true, message: 'Access tokens updated successfully.' });
    } catch (error) {
        console.error('Error exchanging public tokens:', error);
        res.status(500).send({ success: false, message: 'Failed to exchange public tokens.' });
    }
});

exports.getTransactions = functions.https.onRequest(async (req, res) => {
    try {
        const startDate: string = req.body.start_date;
        const endDate: string = req.body.end_date;

        // Step 1: Retrieve access tokens from Firestore
        const accessTokensSnapshot = await db.collection('accessTokens').get();
        const accessTokens: string[] = accessTokensSnapshot.docs.map(doc => doc.data().accessToken);

        if (accessTokens.length === 0) {
            res.status(404).send({ error: 'No access tokens found in Firestore.' });
            return;
        }

        // Delete old transactions (consider implications and costs)
        const transactionsSnapshot = await db.collection('transactions').get();
        transactionsSnapshot.forEach(doc => {
            doc.ref.delete(); // Delete each document
        });

        // Step 2: Iterate over each access token to fetch and store transactions
        for (const accessToken of accessTokens) {
            const transactionsResponse = await client.transactionsGet({
                access_token: accessToken,
                start_date: startDate,
                end_date: endDate,
            });

            const transactions = transactionsResponse.data.transactions;

            const batch = db.batch();

            transactions.forEach(transaction => {
                const docRef = db.collection('transactions').doc(transaction.transaction_id);
                batch.set(docRef, transaction);
            });

            await batch.commit();
        }

        res.status(200).send({ success: true, message: 'Transactions fetched and stored successfully for all tokens.' });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send({ success: false, message: 'Failed to fetch transactions for one or more tokens.' });
    }
});

exports.calculateMonthlyBudget = functions.https.onRequest(async (req, res) => {
    try {
        const transactionsSnapshot = await db.collection('transactions').get();
        const transactions = transactionsSnapshot.docs.map(doc => doc.data());

        interface TotalsByCategory {
            [category: string]: { total: number; count: number };
        }

        // Aggregate transactions by category
        const totalsByCategory: TotalsByCategory = {};

        transactions.forEach(transaction => {
            const category: string = transaction.category[0]; // Assuming top-level category
            const amount: number = transaction.amount;

            if (!totalsByCategory[category]) {
                totalsByCategory[category] = { total: 0, count: 0 };
            }

            totalsByCategory[category].total += amount;
            totalsByCategory[category].count++;
        });

        // Calculate average monthly budget per category
        const monthlyBudgets: { [category: string]: number } = {};
        for (const category in totalsByCategory) {
            const { total, count } = totalsByCategory[category];
            monthlyBudgets[category] = total / count; // Or divide by number of months, if applicable
        }

        res.status(200).send({ success: true, monthlyBudgets });
    } catch (error) {
        console.error('Error calculating monthly budgets:', error);
        res.status(500).send({ success: false, message: 'Failed to calculate monthly budgets.' });
    }
});
