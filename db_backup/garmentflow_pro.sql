-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: garmentflow_pro
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `garmentflow_pro`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `garmentflow_pro` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `garmentflow_pro`;

--
-- Table structure for table `bags`
--

DROP TABLE IF EXISTS `bags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int DEFAULT NULL,
  `bag_number` varchar(255) DEFAULT NULL,
  `shade` varchar(255) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bags`
--

LOCK TABLES `bags` WRITE;
/*!40000 ALTER TABLE `bags` DISABLE KEYS */;
INSERT INTO `bags` VALUES (1,1,'341028','Red','2026-10-26');
/*!40000 ALTER TABLE `bags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch_records`
--

DROP TABLE IF EXISTS `dispatch_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bag_number` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `vehicle_no` varchar(255) DEFAULT NULL,
  `driver_name` varchar(255) DEFAULT NULL,
  `gate_pass_no` varchar(255) DEFAULT NULL,
  `total_rolls` int DEFAULT '0',
  `total_weight` double DEFAULT '0',
  `dispatched_at` varchar(255) DEFAULT NULL,
  `dispatched_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bag_number` (`bag_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch_records`
--

LOCK TABLES `dispatch_records` WRITE;
/*!40000 ALTER TABLE `dispatch_records` DISABLE KEYS */;
INSERT INTO `dispatch_records` VALUES (1,'341028','Al-Hamd Fibers','LES-588','Irfan Majeed','GP-341028-1320',20,586.5,'2026-10-26 13:20','c1234');
/*!40000 ALTER TABLE `dispatch_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `downtime`
--

DROP TABLE IF EXISTS `downtime`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `downtime` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine` varchar(255) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `start` varchar(255) DEFAULT NULL,
  `end` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `downtime`
--

LOCK TABLES `downtime` WRITE;
/*!40000 ALTER TABLE `downtime` DISABLE KEYS */;
/*!40000 ALTER TABLE `downtime` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fabric_rolls`
--

DROP TABLE IF EXISTS `fabric_rolls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fabric_rolls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order` varchar(255) DEFAULT NULL,
  `plan_id` varchar(255) DEFAULT NULL,
  `bag_number` varchar(255) DEFAULT NULL,
  `lot_name` varchar(255) DEFAULT NULL,
  `roll_no` int DEFAULT NULL,
  `weight` double DEFAULT NULL,
  `tube_no` varchar(255) DEFAULT NULL,
  `needles` varchar(255) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `barcode_used` varchar(255) DEFAULT NULL,
  `roll_barcode` varchar(255) DEFAULT NULL,
  `machine_no` varchar(255) DEFAULT NULL,
  `is_merged` int DEFAULT '0',
  `merge_count` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fabric_rolls`
--

LOCK TABLES `fabric_rolls` WRITE;
/*!40000 ALTER TABLE `fabric_rolls` DISABLE KEYS */;
INSERT INTO `fabric_rolls` VALUES (1,'22398','22188','341028','LoT-X',1,33,'T-101','2660','2026-10-26 08:16','46392','R-341028-01','19',0,0),(2,'22398','22188','341028','LoT-X',2,33.6,'T-102','2660','2026-10-26 08:16','46392','R-341028-02','19',0,0),(3,'22398','22188','341028','Lot-A',1,15,'T-101','1512','2026-10-26 08:27','08494','R-341028-01','15',0,0),(4,'22398','22188','341028','Lot-A',2,29.4,'T-101','1512','2026-10-26 12:19','08494','R-341028-02','15',0,0),(5,'22398','22188','341028','Lot-A',3,33.4,'T-102','1512','2026-10-26 12:19','08494','R-341028-03','15',0,0),(6,'22398','22188','341028','Lot-A',4,34.4,'T-103','1512','2026-10-26 12:19','08494','R-341028-04','15',0,0),(7,'22398','22188','341028','LoT-X',3,44.9,'T-104','2660','2026-10-26 12:20','46392','R-341028-03','19',0,0),(8,'22398','22188','341028','LoT-X',4,44.9,'T-105','2660','2026-10-26 12:20','46392','R-341028-04','19',0,0),(9,'22398','22188','341028','LoT-X',5,33.6,'T-106','2660','2026-10-26 12:20','46392','R-341028-05','19',0,0),(10,'22398','22188','341028','LoT-X',6,10,'T-107','2660','2026-10-26 12:20','46392','R-341028-06','19',0,0),(11,'22398','22188','341028','Lot-A',5,33.6,'T-108','1512','2026-10-26 12:21','08494','R-341028-05','15',0,0),(12,'22398','22188','341028','Lot-A',6,22.9,'T-109','1512','2026-10-26 12:21','08494','R-341028-06','15',0,0),(13,'22398','22188','341028','Lot-A',7,33.4,'T-110','1512','2026-10-26 12:21','08494','R-341028-07','15',0,0),(14,'22398','22188','341028','Lot-A',8,29.8,'T-111','1512','2026-10-26 12:21','08494','R-341028-08','15',0,0),(15,'22398','22188','341028','Lot-A',9,32.8,'T-112','1512','2026-10-26 12:21','08494','R-341028-09','15',0,0),(16,'22398','22188','341028','Lot-A',10,11.9,'T-113','1512','2026-10-26 12:21','08494','R-341028-10','15',0,0),(17,'22398','22188','341028','Lot-A',11,41.7,'T-114','1512','2026-10-26 12:22','08494','R-341028-11','15',0,0),(18,'22398','22188','341028','Lot-A',12,33.9,'T-115','1512','2026-10-26 12:22','08494','R-341028-12','15',0,0),(19,'22398','22188','341028','Lot-A',13,41.8,'T-116','1512','2026-10-26 12:22','08494','R-341028-13','15',0,0),(20,'22398','22188','341028','Lot-A',14,26,'T-117','1512','2026-10-26 12:22','08494','R-341028-14','15',0,0);
/*!40000 ALTER TABLE `fabric_rolls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `faults`
--

DROP TABLE IF EXISTS `faults`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faults` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faults`
--

LOCK TABLES `faults` WRITE;
/*!40000 ALTER TABLE `faults` DISABLE KEYS */;
/*!40000 ALTER TABLE `faults` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finalized_bags`
--

DROP TABLE IF EXISTS `finalized_bags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finalized_bags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bag_number` varchar(255) DEFAULT NULL,
  `work_order` varchar(255) DEFAULT NULL,
  `total_rolls` int DEFAULT '0',
  `total_weight` double DEFAULT '0',
  `status` varchar(255) DEFAULT 'Pending',
  `created_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bag_number` (`bag_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finalized_bags`
--

LOCK TABLES `finalized_bags` WRITE;
/*!40000 ALTER TABLE `finalized_bags` DISABLE KEYS */;
INSERT INTO `finalized_bags` VALUES (1,'341028','22398',20,586.5,'Dispatched','2026-10-26 13:19');
/*!40000 ALTER TABLE `finalized_bags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hr_attendance`
--

DROP TABLE IF EXISTS `hr_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int DEFAULT NULL,
  `date` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `marked_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hr_attendance`
--

LOCK TABLES `hr_attendance` WRITE;
/*!40000 ALTER TABLE `hr_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `hr_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hr_ledger`
--

DROP TABLE IF EXISTS `hr_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `description` text,
  `date` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hr_ledger`
--

LOCK TABLES `hr_ledger` WRITE;
/*!40000 ALTER TABLE `hr_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `hr_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hr_staff`
--

DROP TABLE IF EXISTS `hr_staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_staff` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_code` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `cnic` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `sub_role` varchar(255) DEFAULT NULL,
  `salary` double DEFAULT '0',
  `address` text,
  `emergency_name` varchar(255) DEFAULT NULL,
  `emergency_phone` varchar(255) DEFAULT NULL,
  `blood_group` varchar(255) DEFAULT NULL,
  `joining_date` varchar(255) DEFAULT NULL,
  `shift` varchar(255) DEFAULT 'Day',
  `status` varchar(255) DEFAULT 'Active',
  `joining_form_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `emp_code` (`emp_code`),
  UNIQUE KEY `cnic` (`cnic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hr_staff`
--

LOCK TABLES `hr_staff` WRITE;
/*!40000 ALTER TABLE `hr_staff` DISABLE KEYS */;
/*!40000 ALTER TABLE `hr_staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job` int DEFAULT NULL,
  `work_order_ref` varchar(255) DEFAULT NULL,
  `shade_ref` varchar(255) DEFAULT NULL,
  `needles_ref` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
INSERT INTO `jobs` VALUES (1,1,'22398','Red','2660'),(2,2,'22398','Red','1512');
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lots`
--

DROP TABLE IF EXISTS `lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bag_id` int DEFAULT NULL,
  `lot_name` varchar(255) DEFAULT NULL,
  `fabric_length` double DEFAULT '0',
  `fabric_weight` double DEFAULT '0',
  `plan_weight` double DEFAULT '0',
  `bag_weight` double DEFAULT '0',
  `needles` varchar(255) DEFAULT NULL,
  `job_id` int DEFAULT NULL,
  `remarks` text,
  `created_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lots`
--

LOCK TABLES `lots` WRITE;
/*!40000 ALTER TABLE `lots` DISABLE KEYS */;
INSERT INTO `lots` VALUES (1,1,'LoT-X',72,0,200,200,'2660',1,'','2026-10-26'),(2,1,'Lot-A',35,0.000000000000014210854715202004,420,420,'1512',2,'','2026-10-26');
/*!40000 ALTER TABLE `lots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_assignments`
--

DROP TABLE IF EXISTS `machine_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_full_text` varchar(255) DEFAULT NULL,
  `needles` varchar(255) DEFAULT NULL,
  `machine_no` varchar(255) DEFAULT NULL,
  `unit_no` int DEFAULT NULL,
  `unique_code` varchar(255) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `work_order` varchar(255) DEFAULT NULL,
  `shade` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_code` (`unique_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_assignments`
--

LOCK TABLES `machine_assignments` WRITE;
/*!40000 ALTER TABLE `machine_assignments` DISABLE KEYS */;
INSERT INTO `machine_assignments` VALUES (1,'1/22398','2660','19',1,'46392','2026-10-26 07:55','22398','Red'),(2,'2/22398','1512','15',1,'08494','2026-10-26 08:27','22398','Red');
/*!40000 ALTER TABLE `machine_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operators`
--

DROP TABLE IF EXISTS `operators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `start` double DEFAULT NULL,
  `end` double DEFAULT NULL,
  `errors` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operators`
--

LOCK TABLES `operators` WRITE;
/*!40000 ALTER TABLE `operators` DISABLE KEYS */;
/*!40000 ALTER TABLE `operators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int DEFAULT NULL,
  `plan_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,1,'22188');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production`
--

DROP TABLE IF EXISTS `production`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift` varchar(255) DEFAULT NULL,
  `machine` varchar(255) DEFAULT NULL,
  `qty` double DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production`
--

LOCK TABLES `production` WRITE;
/*!40000 ALTER TABLE `production` DISABLE KEYS */;
/*!40000 ALTER TABLE `production` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_checks`
--

DROP TABLE IF EXISTS `quality_checks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quality_checks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roll_id` varchar(255) DEFAULT NULL,
  `original_weight` double DEFAULT NULL,
  `grade_a_weight` double DEFAULT NULL,
  `grade_b_weight` double DEFAULT NULL,
  `in_store` int DEFAULT '0',
  `checked_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roll_id` (`roll_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_checks`
--

LOCK TABLES `quality_checks` WRITE;
/*!40000 ALTER TABLE `quality_checks` DISABLE KEYS */;
INSERT INTO `quality_checks` VALUES (1,'R-341028-02',33.6,33.6,0,2,'2026-10-26 08:17'),(2,'R-341028-01',22.6,22.6,0,2,'2026-10-26 08:18'),(3,'R-341028-03',33.4,33.4,0,2,'2026-10-26 12:52'),(4,'R-341028-04',34.4,34.4,0,2,'2026-10-26 12:52'),(5,'R-341028-05',33.6,33.6,0,2,'2026-10-26 12:52'),(6,'R-341028-06',10,10,0,2,'2026-10-26 12:53'),(7,'R-341028-07',33.4,33.4,0,2,'2026-10-26 12:53'),(8,'R-341028-08',29.8,29.8,0,2,'2026-10-26 12:53'),(9,'R-341028-09',32.8,32.8,0,2,'2026-10-26 12:53'),(10,'R-341028-10',11.9,11.9,0,2,'2026-10-26 12:53'),(11,'R-341028-11',41.7,41.7,0,2,'2026-10-26 12:53'),(12,'R-341028-12',33.9,33.9,0,2,'2026-10-26 12:53'),(13,'R-341028-13',41.8,41.8,0,2,'2026-10-26 12:54'),(14,'R-341028-14',26,26,0,2,'2026-10-26 12:54');
/*!40000 ALTER TABLE `quality_checks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rolls`
--

DROP TABLE IF EXISTS `rolls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rolls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(255) DEFAULT NULL,
  `design` varchar(255) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `job` varchar(255) DEFAULT NULL,
  `machine` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rolls`
--

LOCK TABLES `rolls` WRITE;
/*!40000 ALTER TABLE `rolls` DISABLE KEYS */;
/*!40000 ALTER TABLE `rolls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `samples`
--

DROP TABLE IF EXISTS `samples`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `samples` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sample` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `samples`
--

LOCK TABLES `samples` WRITE;
/*!40000 ALTER TABLE `samples` DISABLE KEYS */;
/*!40000 ALTER TABLE `samples` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'noman@ikram','hadi1.5)','admin'),(2,'zahoor','za786','incharge'),(3,'c1234','cp1234','clerk');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_orders`
--

LOCK TABLES `work_orders` WRITE;
/*!40000 ALTER TABLE `work_orders` DISABLE KEYS */;
INSERT INTO `work_orders` VALUES (1,'22398');
/*!40000 ALTER TABLE `work_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `yarn`
--

DROP TABLE IF EXISTS `yarn`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `yarn` (
  `id` int NOT NULL AUTO_INCREMENT,
  `yarn` varchar(255) DEFAULT NULL,
  `qty` double DEFAULT NULL,
  `machine` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `yarn`
--

LOCK TABLES `yarn` WRITE;
/*!40000 ALTER TABLE `yarn` DISABLE KEYS */;
/*!40000 ALTER TABLE `yarn` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'garmentflow_pro'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-26 15:02:28
