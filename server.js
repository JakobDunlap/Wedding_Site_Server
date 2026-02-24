const express = require('express');
const app = express();
// I think for local testing I have to use a dbconn string -- "process.env.DATABASE_URI" wont exist until I launch on Render(?)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const cors = require('cors');
const PORT = process.env.PORT || 3000;

const guestSchema = new Schema({
    guestFirst: {
        type: String,
        required: true
    },
    guestLast: {
        type: String,
        required: true
    },
    attending: {
        type: Boolean,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    additionalGuests: [
        {
            first: String,
            last: String
        }
    ]
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

mongoose.connect(process.env.DATABASE_URI)
  .then(() => console.log("Successfully connected to MongoDB"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });



app.post("/form", async (req, res) => {
  const formData = req.body;
  const Guest = mongoose.model("Guest", guestSchema);
  const newItem = new Guest(formData);
  try {
    await newItem.save();
    res.status(201).json({ message: "Data saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).send("Unable to save to database");
  }
});