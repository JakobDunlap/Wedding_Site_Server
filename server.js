const express = require('express');
const path = require('path');
const fs = require('fs');
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

// Get all data from the database as a Model
const guestModel = mongoose.model('guests', guestSchema);

// Nodemailer transporter - configures connection for email
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', express.static('public'));
app.use('/', require('./root'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to database
mongoose.connect(url)
  .then(() => console.log("Successfully connected to MongoDB"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Debug any errors with the Email server
transporter.verify((error, success) => {
  if (error) {
    console.error(error);
  } else {
    console.log("SMTP server is ready");
  }
});

// Serve basic HTML index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Display all raw mongoDB data as JSON
app.get('/rawdata', async (req, res) => {
  try {
    const results = await guestModel.find().select('-_id -__v' );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Display all mongoDB data, formatted
app.get('/data', async (req, res) => {
  try {
    let results = await guestModel.find().select('-_id -__v' ); // Get data 
    let resultString = JSON.stringify(results);
    let html = fs.readFileSync('./index.html', 'utf8');
    // Format raw JSON data
    resultString = resultString.replaceAll(`"dietaryRestriction":""`, ``);
    resultString = resultString.replaceAll(`"additionalGuests":[]`, ``);
    resultString = resultString.replaceAll(`{"guestName":`, `Guest Name: `);
    resultString = resultString.replaceAll(`[G`, `G`);
    resultString = resultString.replaceAll(`,"attending":`, `\nAttending: `);
    resultString = resultString.replaceAll(`,"email":`, `\nEmail: `);
    resultString = resultString.replaceAll(`,"additionalGuests":`, `\nAdditional Guests: `);
    resultString = resultString.replaceAll(`,"dietaryRestriction":`, `\nDietary Restriction: `);
    resultString = resultString.replaceAll(/,"_id":".{24}"/g, ``);
    resultString = resultString.replaceAll(`{"additionalGuestName":`, `Additional Guest Name: `);
    resultString = resultString.replaceAll(`},Additional Guest Name:`, `\n\t\t\t\t Additional Guest Name: `);
    resultString = resultString.replaceAll(`,Guest Name`, `\n\nGuest Name`);
    resultString = resultString.replaceAll(`[`, ``);
    resultString = resultString.replaceAll(`}`, ``);
    resultString = resultString.replaceAll(`}]`, ``);
    resultString = resultString.replaceAll(`,,}`, ``);
    resultString = resultString.replaceAll(`}],}`, ``);
    resultString = resultString.replaceAll(`"}`, `"`);
    resultString = resultString.replaceAll(`]`, ``);
    resultString = resultString.replaceAll(`,,`, ``);
    resultString = resultString.replaceAll(`",\n`, `"\n`);
    
    html = html.replace('API Index Page', resultString);
    res.send(html);
  } catch (err) {
    console.log(err);
    res.status(400).send("error");
  }
});

app.post("/form", async (req, res) => {
  const formData = req.body;
  const emailAddressFromForm = formData.email;
  const nameFromForm = formData.guestName;
  const Guest = mongoose.model("Guest", guestSchema);
  const newItem = new Guest(formData);
  try {
    await newItem.save(); //MAYBE MOVE THIS LATER IN CODE, MAYBE PUT 'await' BEFORE 'transporter.sendEmail'

    // Send confirmation email
    console.log(`Attempting to send confirmation email to "${emailAddressFromForm}"`);
    await transporter.sendMail({
      from: 'MyWebsite',
      to: emailAddressFromForm,
      subject: 'ya got mail',
      html: `
        <html style="background-color:#DDDDDD;">
          <div style="font-family:Century, Georgia, Times, serif;display:block;margin:auto;text-align:center;">
            <h1 style="font-size:24pt;">Thank You!</h1>
            <p style="font-size:13pt;">
              We received the information you provided on the form - if you need to change
              any of the information you provided, including whether you will be
              attending, email Jake at jakob_dunlap@outlook.com and he will make sure that
              the bride-and-groom-to-be have all the right info!
            </p>
            <img src="cid:email-image" style="width:80wv;" alt="For screen readers: Itinerary is as follows. The wedding ceremony is at 3pm central. Cocktail hour is at 4pm. Reception is at 5pm. The ceremeony and reception will be held at 16140 Hollingsworth Rd, Basehor, Kansas 66007"/>
          </div>
        </html>
      `,
      attachments: [
        {
          filename: 'email-image.jpg',
          path: './email-image.jpg',
          cid: 'email-image'
        }
      ]
    }).then(() => {
      console.log('Email sent');
    }).catch(err => {  //MAYBE REMOVE THIS?
      console.error(err);
    });

    // Send email to site owner
    console.log(`Attempting to send notification email to site owner"`);
    await transporter.sendMail({
      from: 'MyWebsite',
      to: 'jakob_dunlap@outlook.com',
      subject: 'New guest has RSVPd',
      html: `<h1>Hi how are you</h1><br><p>${nameFromForm} has RSVP'd</p>`
    }).then(() => {
      console.log('Email sent');
    }).catch(err => {  //MAYBE REMOVE THIS?
      console.error(err);
    });

    res.status(201).json({ message: "Data saved successfully" });

  } catch (err) {
    console.error(err);
    res.status(400).send("Unable to save to database");
  }
});