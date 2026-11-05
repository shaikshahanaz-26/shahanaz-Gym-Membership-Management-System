require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gym_membership_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.get('/', async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
       (SELECT COUNT(*) FROM members) total_members,
       (SELECT COUNT(*) FROM subscriptions WHERE start_date <= CURDATE() AND end_date >= CURDATE()) active_memberships,
       (SELECT COUNT(*) FROM subscriptions WHERE end_date < CURDATE()) expired_memberships,
       (SELECT COALESCE(SUM(p.fee),0) FROM subscriptions s JOIN membership_plans p ON p.plan_id=s.plan_id WHERE s.payment_status='Paid') revenue
    `);
    const [latest] = await pool.query(`
      SELECT s.subscription_id,m.name member_name,p.plan_name,s.start_date,s.end_date,s.payment_status
      FROM subscriptions s JOIN members m ON m.member_id=s.member_id
      JOIN membership_plans p ON p.plan_id=s.plan_id ORDER BY s.subscription_id DESC LIMIT 5
    `);
    const [expiring] = await pool.query(`
      SELECT m.name member_name,s.end_date,p.plan_name
      FROM subscriptions s JOIN members m ON m.member_id=s.member_id
      JOIN membership_plans p ON p.plan_id=s.plan_id
      WHERE s.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY s.end_date
    `);
    res.render('dashboard', { stats, latest, expiring, page:'dashboard' });
  } catch (e) { res.status(500).send(dbError(e)); }
});

app.get('/members', async (req,res) => {
  try {
    const search = (req.query.search || '').trim();
    const [members] = await pool.query(`
      SELECT m.*, GROUP_CONCAT(DISTINCT t.trainer_name SEPARATOR ', ') trainers
      FROM members m LEFT JOIN member_trainers mt ON mt.member_id=m.member_id
      LEFT JOIN trainers t ON t.trainer_id=mt.trainer_id
      WHERE m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?
      GROUP BY m.member_id ORDER BY m.member_id DESC`, [`%${search}%`,`%${search}%`,`%${search}%`]);
    const [trainers] = await pool.query('SELECT * FROM trainers ORDER BY trainer_name');
    res.render('members',{members,trainers,search,page:'members'});
  } catch(e){res.status(500).send(dbError(e));}
});
app.post('/members/add', async (req,res) => {
  try {
    const {name,email,phone,join_date,status,trainer_id}=req.body;
    const [r]=await pool.query('INSERT INTO members(name,email,phone,join_date,status) VALUES(?,?,?,?,?)',[name.trim(),email.trim(),phone,join_date,status]);
    if(trainer_id) await pool.query('INSERT IGNORE INTO member_trainers(member_id,trainer_id,assigned_date) VALUES(?,?,CURDATE())',[r.insertId,trainer_id]);
    res.redirect('/members');
  } catch(e){res.status(400).send('Could not add member. Email must be unique. '+e.message);}
});
app.post('/members/:id/edit', async(req,res)=>{
  try { const {name,email,phone,join_date,status}=req.body;
    await pool.query('UPDATE members SET name=?,email=?,phone=?,join_date=?,status=? WHERE member_id=?',[name,email,phone,join_date,status,req.params.id]);
    res.redirect('/members');
  } catch(e){res.status(400).send('Could not update member: '+e.message);}
});
app.post('/members/:id/delete',async(req,res)=>{
  try{await pool.query('DELETE FROM members WHERE member_id=?',[req.params.id]);res.redirect('/members');}
  catch(e){res.status(400).send(e.message);}
});

app.get('/plans',async(req,res)=>{
  try{const [plans]=await pool.query('SELECT * FROM membership_plans ORDER BY plan_id DESC');res.render('plans',{plans,page:'plans'});}
  catch(e){res.status(500).send(dbError(e));}
});
app.post('/plans/add',async(req,res)=>{
  try{const {plan_name,duration_months,fee,description}=req.body;
    await pool.query('INSERT INTO membership_plans(plan_name,duration_months,fee,description) VALUES(?,?,?,?)',[plan_name,duration_months,fee,description]);res.redirect('/plans');
  }catch(e){res.status(400).send('Could not add plan: '+e.message);}
});
app.post('/plans/:id/delete',async(req,res)=>{
  try{await pool.query('DELETE FROM membership_plans WHERE plan_id=?',[req.params.id]);res.redirect('/plans');}
  catch(e){res.status(400).send('This plan is already used by a subscription and cannot be deleted.');}
});

app.get('/subscriptions',async(req,res)=>{
  try{
    const [subscriptions]=await pool.query(`SELECT s.*,m.name member_name,p.plan_name,p.fee,
      CASE WHEN s.end_date<CURDATE() THEN 'Expired' WHEN s.start_date>CURDATE() THEN 'Pending' ELSE 'Active' END membership_status
      FROM subscriptions s JOIN members m ON m.member_id=s.member_id JOIN membership_plans p ON p.plan_id=s.plan_id ORDER BY s.subscription_id DESC`);
    const [members]=await pool.query('SELECT member_id,name FROM members ORDER BY name');
    const [plans]=await pool.query('SELECT plan_id,plan_name,duration_months,fee FROM membership_plans ORDER BY plan_name');
    res.render('subscriptions',{subscriptions,members,plans,page:'subscriptions'});
  }catch(e){res.status(500).send(dbError(e));}
});
app.post('/subscriptions/add',async(req,res)=>{
  try{
    const {member_id,plan_id,start_date,payment_status}=req.body;
    const [[plan]]=await pool.query('SELECT duration_months FROM membership_plans WHERE plan_id=?',[plan_id]);
    if(!plan) return res.status(400).send('Select a valid plan.');
    await pool.query(`INSERT INTO subscriptions(member_id,plan_id,start_date,end_date,payment_status)
      VALUES(?,?,?,DATE_ADD(?,INTERVAL ? MONTH),?)`,[member_id,plan_id,start_date,start_date,plan.duration_months,payment_status]);
    res.redirect('/subscriptions');
  }catch(e){res.status(400).send('Could not create subscription: '+e.message);}
});
app.post('/subscriptions/:id/payment',async(req,res)=>{
  try{await pool.query('UPDATE subscriptions SET payment_status=? WHERE subscription_id=?',[req.body.payment_status,req.params.id]);res.redirect('/subscriptions');}
  catch(e){res.status(400).send(e.message);}
});
app.post('/subscriptions/:id/delete',async(req,res)=>{
  try{await pool.query('DELETE FROM subscriptions WHERE subscription_id=?',[req.params.id]);res.redirect('/subscriptions');}
  catch(e){res.status(400).send(e.message);}
});

app.get('/trainers',async(req,res)=>{
  try{
    const [trainers]=await pool.query(`SELECT t.*,COUNT(mt.member_id) assigned_count FROM trainers t
      LEFT JOIN member_trainers mt ON mt.trainer_id=t.trainer_id GROUP BY t.trainer_id ORDER BY t.trainer_id DESC`);
    const [members]=await pool.query('SELECT member_id,name FROM members ORDER BY name');
    res.render('trainers',{trainers,members,page:'trainers'});
  }catch(e){res.status(500).send(dbError(e));}
});
app.post('/trainers/add',async(req,res)=>{
  try{const {trainer_name,specialization,phone}=req.body;
    await pool.query('INSERT INTO trainers(trainer_name,specialization,phone) VALUES(?,?,?)',[trainer_name,specialization,phone]);res.redirect('/trainers');
  }catch(e){res.status(400).send(e.message);}
});
app.post('/trainers/assign',async(req,res)=>{
  try{const {member_id,trainer_id}=req.body;
    await pool.query('INSERT IGNORE INTO member_trainers(member_id,trainer_id,assigned_date) VALUES(?,?,CURDATE())',[member_id,trainer_id]);res.redirect('/trainers');
  }catch(e){res.status(400).send('Could not assign trainer: '+e.message);}
});
app.post('/trainers/:id/delete',async(req,res)=>{
  try{await pool.query('DELETE FROM trainers WHERE trainer_id=?',[req.params.id]);res.redirect('/trainers');}
  catch(e){res.status(400).send(e.message);}
});

function dbError(e){return 'Database error: '+e.message+'<br><br>Check that MySQL is running, database SQL was executed, and .env credentials are correct.';}
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Shahanaz Gym Management System running at http://localhost:${port}`));
