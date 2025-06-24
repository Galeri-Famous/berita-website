import { google } from 'googleapis';
import formidable from 'formidable-serverless';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form error' });

    const { judul, konten } = fields;
    const gambarPath = files.gambar.filepath;
    const id = uuidv4();

    const auth = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    auth.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      const media = {
        mimeType: files.gambar.mimetype,
        body: fs.createReadStream(gambarPath),
      };
      const upload = await drive.files.create({
        resource: { name: `${judul}-img.jpg` },
        media,
        fields: 'id',
      });

      const imageUrl = `https://drive.google.com/uc?id=${upload.data.id}`;

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID,
        range: 'Sheet1!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[id, judul, konten, imageUrl]]
        },
      });

      res.status(200).json({ success: true, id, imageUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Gagal menyimpan ke Google Sheets' });
    }
  });
}
