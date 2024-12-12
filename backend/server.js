const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());  // CORS'u etkinleştir
app.use(express.json()); // JSON verilerini alabilmek için

// PostgreSQL bağlantısı
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'COME381',
  password: '3652',
  port: 5432,
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => {
    console.error('Connection error', err.stack);
    process.exit(1);  // Bağlantı hatası durumunda uygulamayı durdur
  });

// Ürün verilerini çekecek API endpoint'i
app.get('/api/data', async (req, res) => {
  const { category, id } = req.query;

  try {
    let query = `
      SELECT p.productid, p.pname AS product_name, p.price, p.stockquantity, p.imageurl, p.description, c.cname AS category_name
      FROM products p
      JOIN categories c ON c.categoryid = p.cid
    `;
    const queryParams = [];

    // Eğer kategori parametresi varsa, kategoriye göre filtreleme yapıyoruz
    if (category) {
      query += ' WHERE c.cname = $1';
      queryParams.push(category);
    }

    // Eğer id parametresi varsa, geçerli bir sayıya dönüştürülüp sorguya ekliyoruz
    if (id) {
      const productId = parseInt(id, 10);  // String'den integer'a dönüştürme
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      if (queryParams.length > 0) {
        // Eğer kategori parametresi varsa, id'yi ikinci parametre olarak ekliyoruz
        query += ' AND p.productid = $2';
        queryParams.push(productId);
      } else {
        // Eğer kategori parametresi yoksa, id'yi ilk parametre olarak ekliyoruz
        query += ' WHERE p.productid = $1';
        queryParams.push(productId);
      }
    }

    // SQL sorgusunu çalıştırıyoruz
    const result = await client.query(query, queryParams);

    // Eğer veri varsa, ürünleri JSON olarak döndürüyoruz
    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      // Eğer sonuç yoksa, 404 hatası döndürüyoruz
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    // Eğer bir hata oluşursa, hata mesajı ile 500 döndürüyoruz
    console.error('Error fetching data:', error.message);
    res.status(500).json({ message: 'Failed to fetch product data', error: error.message });
  }
});

// Kategorileri çekecek API endpoint'i
app.get('/api/categories', async (req, res) => {
  try {
    const result = await client.query('SELECT cname FROM categories');
    res.json(result.rows.map(row => row.cname));  // Kategorilerin adlarını döndürüyoruz
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

// Sunucuyu başlatıyoruz
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
