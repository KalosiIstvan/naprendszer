
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/bolygok', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT bolygok.*, bolygo_tipusok.tipus_neve
      FROM bolygok
      INNER JOIN bolygo_tipusok
      ON bolygok.tipus_id = bolygo_tipusok.tipus_id
      ORDER BY bolygok.bolygo_id
    `);

    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Adatbázis hiba történt.'
    });
  }
});

app.get('/api/tipus', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT tipus_id, tipus_neve
      FROM bolygo_tipusok
      ORDER BY tipus_id
    `);

    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Adatbázis hiba történt.'
    });
  }
});

app.post('/api/ujbolygo', async (req, res) => {
  const {
    bolygo_id,
    neve,
    tipus_id,
    tomeg,
    egyenlitori_sugar,
    holdak_szama,
    nap_tavolsag,
    fold_tavolsag,
    leiras,
    url
  } = req.body || {};

  if (typeof neve !== 'string' || !neve.trim()) {
    return res.status(400).json({
      error: 'A név megadása kötelező!'
    });
  }

  const requiredNumbers = [
    ['tipus_id', tipus_id],
    ['tomeg', tomeg],
    ['egyenlitori_sugar', egyenlitori_sugar],
    ['holdak_szama', holdak_szama],
    ['nap_tavolsag', nap_tavolsag]
  ];

  for (const [field, value] of requiredNumbers) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      !Number.isFinite(Number(value))
    ) {
      return res.status(400).json({
        error: `A(z) ${field} megadása kötelező és számnak kell lennie!`
      });
    }
  }

  if (
    !Number.isInteger(Number(tipus_id)) ||
    Number(tipus_id) <= 0 ||
    !Number.isInteger(Number(holdak_szama)) ||
    Number(holdak_szama) < 0
  ) {
    return res.status(400).json({
      error: 'Érvénytelen típusazonosító vagy holdszám!'
    });
  }

  if (typeof leiras !== 'string' || !leiras.trim()) {
    return res.status(400).json({
      error: 'A leírás megadása kötelező!'
    });
  }

  if (
    fold_tavolsag !== undefined &&
    fold_tavolsag !== null &&
    fold_tavolsag !== '' &&
    !Number.isFinite(Number(fold_tavolsag))
  ) {
    return res.status(400).json({
      error: 'A fold_tavolsag szám kell legyen!'
    });
  }

  if (
    bolygo_id !== undefined &&
    bolygo_id !== null &&
    (
      !Number.isInteger(Number(bolygo_id)) ||
      Number(bolygo_id) <= 0
    )
  ) {
    return res.status(400).json({
      error: 'Érvénytelen bolygóazonosító!'
    });
  }

  try {
    const [result] = await db.execute(`
      INSERT INTO bolygok (
        bolygo_id,
        neve,
        tipus_id,
        tomeg,
        egyenlitori_sugar,
        holdak_szama,
        nap_tavolsag,
        fold_tavolsag,
        leiras,
        url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bolygo_id ?? null,
      neve.trim(),
      Number(tipus_id),
      Number(tomeg),
      Number(egyenlitori_sugar),
      Number(holdak_szama),
      Number(nap_tavolsag),
      fold_tavolsag === undefined ||
      fold_tavolsag === null ||
      fold_tavolsag === ''
        ? null
        : Number(fold_tavolsag),
      leiras.trim(),
      typeof url === 'string' ? url.trim() : ''
    ]);

    return res.status(201).json({
      message: 'Sikeres beszúrás.',
      insertId: result.insertId,
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Adatbázis hiba történt.'
    });
  }
});

app.delete('/api/torles', async (req, res) => {
  const id = req.body?.id ?? req.body?.bolygo_id;

  if (
    id === undefined ||
    id === null ||
    id === '' ||
    !Number.isInteger(Number(id)) ||
    Number(id) <= 0
  ) {
    return res.status(400).json({
      error: 'Érvényes bolygóazonosító szükséges!'
    });
  }

  try {
    const [result] = await db.execute(
      'DELETE FROM bolygok WHERE bolygo_id = ?',
      [Number(id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Nincs ilyen bolygó az adatbázisban.'
      });
    }

    return res.status(200).json({
      message: 'Sikeres törlés.',
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Adatbázis hiba történt.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend szerver: http://localhost:${PORT}`);
});
