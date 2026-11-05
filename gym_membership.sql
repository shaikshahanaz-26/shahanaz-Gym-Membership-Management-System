CREATE DATABASE IF NOT EXISTS gym_membership_db;
USE gym_membership_db;

CREATE TABLE IF NOT EXISTS members (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15),
  join_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS membership_plans (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(100) NOT NULL,
  duration_months INT NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(plan_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS trainers (
  trainer_id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_name VARCHAR(100) NOT NULL,
  specialization VARCHAR(100),
  phone VARCHAR(15)
);

CREATE TABLE IF NOT EXISTS member_trainers (
  member_id INT NOT NULL,
  trainer_id INT NOT NULL,
  assigned_date DATE NOT NULL,
  PRIMARY KEY (member_id, trainer_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES trainers(trainer_id) ON DELETE CASCADE
);

INSERT INTO membership_plans (plan_name,duration_months,fee,description)
SELECT 'Monthly Fitness',1,1500.00,'One month gym access'
WHERE NOT EXISTS (SELECT 1 FROM membership_plans WHERE plan_name='Monthly Fitness');
INSERT INTO membership_plans (plan_name,duration_months,fee,description)
SELECT 'Quarterly Strength',3,4000.00,'Three months gym access'
WHERE NOT EXISTS (SELECT 1 FROM membership_plans WHERE plan_name='Quarterly Strength');
INSERT INTO membership_plans (plan_name,duration_months,fee,description)
SELECT 'Annual Elite',12,12000.00,'One year gym access with premium facilities'
WHERE NOT EXISTS (SELECT 1 FROM membership_plans WHERE plan_name='Annual Elite');

INSERT INTO trainers (trainer_name,specialization,phone)
SELECT 'Aarav Sharma','Strength Training','9876543210'
WHERE NOT EXISTS (SELECT 1 FROM trainers WHERE trainer_name='Aarav Sharma');
INSERT INTO trainers (trainer_name,specialization,phone)
SELECT 'Meera Rao','Yoga & Flexibility','9876543211'
WHERE NOT EXISTS (SELECT 1 FROM trainers WHERE trainer_name='Meera Rao');
