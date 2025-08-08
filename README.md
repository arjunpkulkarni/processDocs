# Purchase Order Document Processing App

This is a full-stack web application for processing purchase orders. It allows users to upload a purchase order, extracts line items, matches them to a product catalog, and allows a user to confirm the matches, which are then saved to a database.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Flask, Python
- **Database:** PostgreSQL

## How to Run

### Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up the PostgreSQL database:**
    - Install PostgreSQL if you haven't already.
    - Create a new database.
    - Create a `.env` file in the `backend` directory and add your database connection URL:
      ```
      DATABASE_URL="postgresql://user:password@host:port/database"
      ```
    - Run the `init.sql` script to create the necessary tables:
      ```bash
      psql -d your_database_name -f db/init.sql
      ```

5.  **Run the backend server:**
    ```bash
    python run.py
    ```
    The backend will be running at `http://localhost:5000`.

### Frontend

1.  **Navigate to the frontend directory (from the root of the project):**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```
    The frontend will be running at `http://localhost:5173` (or another port if 5173 is busy).

## How to Test

1.  Open your browser and navigate to the frontend URL (e.g., `http://localhost:5173`).
2.  Use the file input to select one of the example purchase orders from the `onsite_documents/Example POs` directory.
3.  Click the **Upload** button. The application will process the document and display the line items with potential matches from the product catalog.
4.  For each line item, review the suggested match in the dropdown menu. If the top match is incorrect, you can select a different one.
5.  Once you have verified all the matches, click the **Confirm Matches** button.
6.  You can then check your PostgreSQL database to confirm that the selected matches have been saved to the `matches` table.

## Demo Video


https://www.loom.com/share/849fe122e6ea4a22aeb4793a1bfd1590
