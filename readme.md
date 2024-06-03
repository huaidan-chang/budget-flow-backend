# Financial Management System Backend with Firebase and Plaid

This project integrates Plaid with Firebase to provide a seamless financial management system backend. It allows users to securely connect their bank accounts, retrieve transaction data, and analyze financial patterns over time.

## Features
- **Secure Connection**: Connect to bank accounts securely using Plaid API.
- **Transaction Management**: Fetch and store transaction data in Firebase.
- **Budget Tracking**: Analyze spending and generate budget reports.
  
## Getting Started
### Prerequisites
- Node.js installed on your machine.
- Firebase CLI installed globally.
- An active account with Plaid with access to API credentials.
### Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/huaidan-chang/plaid-api-backend.git
    cd plaid-api-backend
    ```
2. Login to your Firebase account
   ```bash
   firebase login
   ```
3. Install dependencies
    ```bash
    cd functions
    npm install
    ```
### Configuration
Set up the required environment variables in your Firebase project:
- PLAID_CLIENT_ID
- PLAID_SECRET
  
You can find these in your Plaid dashboard.

### Deployment
1. Create a Firebase project
2. Enable "Cloud Firestore API" in your project
3. Create Firestore Database(use name `(default)`)
4. Check active project
    ```bash
    firebase use
    ```
5. Change active project if needed
    ```bash
    firebase use your-project-name
    ```
6. Deploy your project to Firebase
    ```bash
    firebase deploy
    ```
7. After deploy complete, you'll see four function URL in the terminal.
    ```bash
    Function URL (createPublicTokens(us-central1)): https://us-central1-your-project-name.cloudfunctions.net/createPublicTokens
    Function URL (exchangePublicTokensAndStore(us-central1)): https://us-central1-your-project-name.cloudfunctions.net/exchangePublicTokensAndStore
    Function URL (getTransactions(us-central1)): https://us-central1-your-project-name.cloudfunctions.net/getTransactions
    Function URL (calculateMonthlyBudget(us-central1)): https://us-central1-your-project-name.cloudfunctions.net/calculateMonthlyBudget
   ```
### Usage
Invoke the deployed functions via HTTP requests to handle bank connections, transaction fetching, and budget calculations.

#### Test with Postman using your Function URL
This guide explains how to test the Firebase functions for a financial management system using Postman. Ensure you have Postman installed to proceed with testing.
1. Create Public Key  
    Creates and stores new public tokens for a set of predefined institution IDs and clears any existing tokens from the Firestore. In the deployed version, Chase(ins_56), Bank of America (ins_127989), Capital One (ins_128026) are used.
   - **URL**: `https://us-central1-your-project-name.cloudfunctions.net/createPublicTokens`
   - **Method**: `POST`
   - **Body**: No payload required for this function.
2. Exchange Public Key  
    Exchanges public tokens for access tokens and updates the Firestore accessTokens collection.
   - **URL**: `https://us-central1-your-project-name.cloudfunctions.net/exchangePublicTokensAndStore`
   - **Method**: `POST`
   - **Body**: No payload required for this function.
3. Get Transactions  
   Fetches transactions within a specified date range for each access token stored in Firestore, then stores these transactions in the Firestore transactions collection.
   - **URL**: `https://us-central1-your-project-name.cloudfunctions.net/getTransactions`
   - **Method**: `POST`
   - **Body**: Specify the start and end dates for the transaction period.
        ```json
        {
            "start_date": "2024-05-01",
            "end_date": "2024-06-01"
        }
        ```
4. Calculate Monthly Budget  
   Calculates the total expenditure per category from transactions stored in Firestore and estimates monthly budgets.
   - **URL**: `https://us-central1-your-project-name.cloudfunctions.net/calculateMonthlyBudget`
   - **Method**: `GET`
   - **Body**: No payload required for this function.