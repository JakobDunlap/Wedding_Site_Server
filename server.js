const express = require('express');
const path = require('path');
const router = express.Router();
const app = express();
const url = process.env.DATABASE_URI;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const cors = require('cors');
const nodemailer = require('nodemailer');
const PORT = process.env.PORT || 5000;

const emailUser = process.env.NEXT_PUBLIC_EMAIL_USER;
const emailPass = process.env.NEXT_PUBLIC_EMAIL_PASS;

// Schema for guests who fill out the form
const guestSchema = new Schema({
    guestName: {
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
            additionalGuestName: String
        }
    ],
    dietaryRestriction: {
        type: String,
        required: false
    }
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', express.static('/public'));
app.use('/', require('./root'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

mongoose.connect(url)
  .then(() => console.log("Successfully connected to MongoDB"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.post("/form", async (req, res) => {
  const formData = req.body;
  const emailAddressFromForm = formData.email;
  const Guest = mongoose.model("Guest", guestSchema);
  const newItem = new Guest(formData);
  try {
    await newItem.save();
    res.status(201).json({ message: "Data saved successfully" });

    // Send email
    console.log(`Attempting to send confirmation email to "${emailAddressFromForm}"`);
    transporter.sendMail({
      to: emailAddressFromForm,
      subject: 'ya got mail',
      html: '<h1>Hi how are you</h1><br><p>subtext</p>'
    }).then(() => {
      console.log('Email sent');
    }).catch(err => {
      console.error(err);
    });

  } catch (err) {
    console.error(err);
    res.status(400).send("Unable to save to database");
  }
});