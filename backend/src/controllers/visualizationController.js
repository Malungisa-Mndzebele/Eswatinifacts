import { pool } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';

export async function getCountryComparison(req, res) {
  try {
    const { countries, startDate, endDate, category } = req.query;
    if (!countries) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Countries parameter is required', timestamp: new Date().toISOString() } });
    }
    const countryArray = countries.split(',').map(c => c.trim());
    if (!countryArray.includes('Eswatini')) countryArray.push('Eswatini');
    let query = 'SELECT dp.id, dp.category, dp.metric_name, dp.metric_value, dp.metric_unit, dp.date_recorded, dp.country, ds.name as source_name, ds.url as source_url FROM data_points dp LEFT JOIN data_sources ds ON dp.source_id = ds.id WHERE dp.country = ANY($1)';
    const params = [countryArray];
    let paramIndex = 2;
    if (startDate) { query += ' AND dp.date_recorded >= $' + paramIndex; params.push(new Date(startDate)); paramIndex++; }
    if (endDate) { query += ' AND dp.date_recorded <= $' + paramIndex; params.push(new Date(endDate)); paramIndex++; }
    if (category) { query += ' AND dp.category = $' + paramIndex; params.push(category); paramIndex++; }
    query += ' ORDER BY dp.country, dp.metric_name, dp.date_recorded DESC';
    const result = await pool.query(query, params);
    const dataByCountry = {};
    countryArray.forEach(country => { dataByCountry[country] = []; });
    result.rows.forEach(row => { if (dataByCountry[row.country]) dataByCountry[row.country].push(row); });
    res.json({ success: true, data: { countries: dataByCountry, selectedCountries: countryArray, totalPoints: result.rows.length } });
  } catch (error) {
    console.error('Error fetching country comparison data:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch country comparison data', timestamp: new Date().toISOString() } });
  }
}
export async function getMultiCategoryData(req, res) { res.json({ success: true, data: {} }); }
export async function exportData(req, res) { res.json({ success: true, data: {} }); }
export async function saveFilterConfiguration(req, res) { res.json({ success: true, data: {} }); }
export async function loadFilterConfiguration(req, res) { res.json({ success: true, data: {} }); }
