import app from './app.js'
import {connectDb} from './db/db.js'
import dotenv from 'dotenv'

dotenv.config()

app.listen(process.env.PORT, () =>{
    connectDb()
    console.log(`server is working on http://localhost:${process.env.PORT}`);
})