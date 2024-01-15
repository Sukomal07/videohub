# VideoHub

VideoHub is a web application that allows users to create channels, upload videos to their channels,can see other channel videos, like & dislike videos & comment on videos, create playlists, and engage with their audience. It provides a seamless platform for content creators to manage their video content and interact with subscribers.

## Getting Started

### Prerequisites

- Node.js installed
- MongoDB installed and running
- Cloudinary account

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Sukomal07/videohub.git
   cd videohub
   ```

2. Install dependencies:

   ```bash
    npm install
   ```

3. Set up the MongoDB database:

   - Create a MongoDB database.
   - Update the database connection string in the `.env` file.

4. Set up cloudinary:

   ```bash
   CLOUDINARY_CLOUD_NAME=<your cloud name>
   CLOUDINARY_API_KEY=<your api key>
   CLOUDINARY_API_SECRET=<your api secret>
   ```

5. Set up .env file:

   ```bash
    PORT=8080
    MONGO_URI=<mongodb connection string>
    FRONTEND_URL=
    ACCESS_TOKEN_SECRET=<>
    ACCESS_TOKEN_EXPIRY=7d
    REFRESH_TOKEN_SECRET=<>
    REFRESH_TOKEN_EXPIRY=10d
    CLOUDINARY_CLOUD_NAME=<your cloud name>
    CLOUDINARY_API_KEY=<your api key>
    CLOUDINARY_API_SECRET=<your api secret>
    NODE_ENV=Development
   ```

6. Start the application:

   - Go to server `cd server` run
   - Go to client `cd client` run

   ```bash
   npm run dev
   ```

   The application should now be running at `http://localhost:5173`.

## Contributing

If you have suggestions or find bugs, feel free to open an issue or submit a pull request.
