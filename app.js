const path = require('path');
const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const fs = require('fs');
const axios = require('axios');

// Import fetch compatible Node <18


const app = express();

// ---------------------- MULTER CONFIG ----------------------
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage }).single('myfile');

// ---------------------- APP CONFIG ----------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));
app.use(express.static('./public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




// ---------------------- EMAIL CHECK ----------------------
function verif_email(email) {
  return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email);
}

const HUNTER_API_KEY = 'b25bc0b51133f842be1950e85d018652440ca367'; // Remplace par ta clé

async function checkEmailExistence(email) {
  const url = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${HUNTER_API_KEY}`;
  try {
    const { data } = await axios.get(url);
    // Le champ data.data.result peut être : "deliverable", "undeliverable", "risky", "unknown"
    return data.data.result === 'deliverable';
  } catch (error) {
    console.error('Erreur Hunter API :', error.response?.data || error.message);
    return false;
  }
}

// ---------------------- ROUTES ----------------------
app.get('/', (req, res) => res.render('index'));

app.post('/uploads', (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.render('index', { msg: err });
    if (!req.file) return res.render('index', { msg: 'Aucun fichier sélectionné.' });

    const inputPath = req.file.path;
    const cleanedFilename = 'cleaned-' + req.file.filename;
    const outputPath = path.join(__dirname, 'uploads', cleanedFilename);

    // Lecture du fichier
    const data = fs.readFileSync(inputPath, 'utf8');
    const emails = data.split('\n');
    const Valid_emails = [];

    // Vérification Regex + API
    for (let email of emails) {
      email = email.trim();
      if(! email) continue;
      if (verif_email(email)) {
        const exists = await checkEmailExistence(email);
        if (exists) Valid_emails.push(email);
      }
    }

    // Écriture du fichier nettoyé
    fs.writeFileSync(outputPath, Valid_emails.join('\n'));

    // Affichage du résultat
    res.render('index', {
      msg: `${Valid_emails.length} emails valides trouvés.`,
      Valid_emails,
      downloadLink: `/uploads/${cleanedFilename}`
    });
  });
});

// ---------------------- SERVER ----------------------
app.listen(3000, () => console.log('Serveur lancé sur http://localhost:3000'));
