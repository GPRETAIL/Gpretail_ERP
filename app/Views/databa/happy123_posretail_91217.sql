-- phpMyAdmin SQL Dump
-- version 4.7.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Dec 09, 2017 at 06:03 PM
-- Server version: 5.6.38
-- PHP Version: 5.6.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `happy123_posretail`
--

-- --------------------------------------------------------

--
-- Table structure for table `aaaa`
--

CREATE TABLE `aaaa` (
  `dd` int(11) NOT NULL,
  `ddd` varchar(2000) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `aaaa`
--

INSERT INTO `aaaa` (`dd`, `ddd`) VALUES
(1, '1'),
(2, '2'),
(3, '3'),
(4, '4'),
(5, '5'),
(6, '6'),
(7, '7'),
(8, '8');

-- --------------------------------------------------------

--
-- Table structure for table `brand`
--

CREATE TABLE `brand` (
  `id` int(11) NOT NULL,
  `name` varchar(200) CHARACTER SET utf8 NOT NULL,
  `created_at` datetime NOT NULL,
  `status` varchar(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `brand`
--

INSERT INTO `brand` (`id`, `name`, `created_at`, `status`) VALUES
(1, 'Acchi', '2017-09-18 14:13:14', '1'),
(2, 'swastik', '2017-10-28 10:48:19', '0'),
(3, 'suhana', '2017-10-28 10:48:31', '0'),
(5, 'Peter England', '2017-10-28 10:49:12', '0');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `created_at` varchar(200) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `created_at`) VALUES
(28, 'Home Needs', '2017-11-10 12:19:03'),
(19, 'Desserts', '2017-10-28 10:54:53'),
(24, 'Masala', '2017-10-28 10:57:32'),
(22, 'Formal Shirts', '2017-10-28 10:55:38'),
(23, 'Formal Pants', '2017-10-28 10:55:49'),
(27, 'sleeves', '2017-11-07 18:23:24');

-- --------------------------------------------------------

--
-- Table structure for table `categorie_expences`
--

CREATE TABLE `categorie_expences` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `categorie_expences`
--

INSERT INTO `categorie_expences` (`id`, `name`, `created_date`) VALUES
(4, 'expan pro cate', '2017-09-12 04:18:11');

-- --------------------------------------------------------

--
-- Table structure for table `combo_items`
--

CREATE TABLE `combo_items` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `countries`
--

CREATE TABLE `countries` (
  `id` int(11) NOT NULL,
  `country_code` varchar(2) NOT NULL DEFAULT '',
  `country_name` varchar(100) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `countries`
--

INSERT INTO `countries` (`id`, `country_code`, `country_name`) VALUES
(1, 'US', 'United States'),
(2, 'CA', 'Canada'),
(3, 'AF', 'Afghanistan'),
(4, 'AL', 'Albania'),
(5, 'DZ', 'Algeria'),
(6, 'DS', 'American Samoa'),
(7, 'AD', 'Andorra'),
(8, 'AO', 'Angola'),
(9, 'AI', 'Anguilla'),
(10, 'AQ', 'Antarctica'),
(11, 'AG', 'Antigua and/or Barbuda'),
(12, 'AR', 'Argentina'),
(13, 'AM', 'Armenia'),
(14, 'AW', 'Aruba'),
(15, 'AU', 'Australia'),
(16, 'AT', 'Austria'),
(17, 'AZ', 'Azerbaijan'),
(18, 'BS', 'Bahamas'),
(19, 'BH', 'Bahrain'),
(20, 'BD', 'Bangladesh'),
(21, 'BB', 'Barbados'),
(22, 'BY', 'Belarus'),
(23, 'BE', 'Belgium'),
(24, 'BZ', 'Belize'),
(25, 'BJ', 'Benin'),
(26, 'BM', 'Bermuda'),
(27, 'BT', 'Bhutan'),
(28, 'BO', 'Bolivia'),
(29, 'BA', 'Bosnia and Herzegovina'),
(30, 'BW', 'Botswana'),
(31, 'BV', 'Bouvet Island'),
(32, 'BR', 'Brazil'),
(33, 'IO', 'British lndian Ocean Territory'),
(34, 'BN', 'Brunei Darussalam'),
(35, 'BG', 'Bulgaria'),
(36, 'BF', 'Burkina Faso'),
(37, 'BI', 'Burundi'),
(38, 'KH', 'Cambodia'),
(39, 'CM', 'Cameroon'),
(40, 'CV', 'Cape Verde'),
(41, 'KY', 'Cayman Islands'),
(42, 'CF', 'Central African Republic'),
(43, 'TD', 'Chad'),
(44, 'CL', 'Chile'),
(45, 'CN', 'China'),
(46, 'CX', 'Christmas Island'),
(47, 'CC', 'Cocos (Keeling) Islands'),
(48, 'CO', 'Colombia'),
(49, 'KM', 'Comoros'),
(50, 'CG', 'Congo');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `discount` varchar(5) DEFAULT NULL,
  `created_at` varchar(150) DEFAULT NULL,
  `customeraddress` text NOT NULL,
  `custidd` varchar(200) NOT NULL,
  `custstate` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `discount`, `created_at`, `customeraddress`, `custidd`, `custstate`) VALUES
(11, 'Rajesh', '9999999', '999@gmail.com', '5', '2017-09-04 14:52:25', 'bbbbbb nnnnnnn cccc', '112233', '21'),
(12, 'Karunakaran', '8608885466', 'karu9487@outlook.com', '25', '2017-09-08 10:53:06', 'asdas das dasd asds', '121', '21'),
(13, 'Hari', '8608608608', 'hari@yahoo.com', '10', '2017-09-08 12:07:30', 'sssssssssssss dddddddddddddd', '1233', '21'),
(14, 'sanju', '1234567899', 'sa@gamil.com', '2', '2017-10-24 10:46:29', '', '534534534', '16'),
(15, 'rishab', '788908980', 'ri@gmailcom', '1', '2017-10-29 16:47:28', '', '121', '21'),
(16, 'ramesh', '9685748596', '', '0', '2017-11-07 17:47:15', '', '212', '21'),
(17, 'Karuna Mano', '9787968563', 'moni@yahoo.com', '10', '2017-11-22 18:46:25', 'Murugappa st,purasawalkam,chennai', '5665', '21'),
(18, 'werwer dsfsdf', '34234234234', 'sdfsdfsd@asd.in', '33', '2017-11-23 21:34:57', 'sdfsdfsdf', '234234', '21');

-- --------------------------------------------------------

--
-- Table structure for table `expences`
--

CREATE TABLE `expences` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `reference` varchar(150) NOT NULL,
  `note` text,
  `amount` float NOT NULL,
  `attachment` varchar(200) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `category_id` int(11) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `expences`
--

INSERT INTO `expences` (`id`, `date`, `reference`, `note`, `amount`, `attachment`, `created_date`, `category_id`, `store_id`, `created_by`) VALUES
(16, '2017-09-12', '430962', '<p>dfg dfgdfgdfg<br></p>', 150, 'aa4dbee03271fc1a96700310f93cce50.jpg', '2017-09-12 04:18:53', 4, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `goodsitems`
--

CREATE TABLE `goodsitems` (
  `idd` int(11) NOT NULL,
  `wareid` varchar(2000) CHARACTER SET utf8 NOT NULL,
  `producid` varchar(200) NOT NULL,
  `qtyy` varchar(200) NOT NULL,
  `datea` date NOT NULL,
  `nowdatt` datetime NOT NULL,
  `goodsid` varchar(200) NOT NULL,
  `totprice` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `goodsout`
--

CREATE TABLE `goodsout` (
  `idd` int(11) NOT NULL,
  `wareid` varchar(200) NOT NULL,
  `dateof` date NOT NULL,
  `refno` varchar(200) NOT NULL,
  `nofof` varchar(200) NOT NULL,
  `createdbb` varchar(200) CHARACTER SET utf8 NOT NULL,
  `todatedate` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `holds`
--

CREATE TABLE `holds` (
  `id` int(11) NOT NULL,
  `number` int(11) NOT NULL,
  `time` varchar(10) NOT NULL,
  `register_id` int(11) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `holds`
--

INSERT INTO `holds` (`id`, `number`, `time`, `register_id`) VALUES
(252, 1, '14:30', 45),
(232, 1, '16:36', 43),
(233, 1, '16:38', 44),
(234, 1, '16:38', 45),
(235, 1, '16:38', 46),
(236, 1, '16:39', 47),
(237, 1, '16:40', 48),
(238, 1, '16:40', 49),
(239, 1, '16:41', 50),
(240, 1, '16:41', 51),
(241, 1, '16:41', 52),
(242, 1, '16:41', 53),
(243, 1, '16:41', 54),
(244, 1, '16:42', 55),
(245, 1, '16:42', 56),
(246, 1, '16:43', 57),
(247, 1, '16:43', 58),
(248, 1, '16:44', 59),
(249, 1, '16:46', 60),
(250, 1, '16:46', 43),
(251, 1, '14:19', 44);

-- --------------------------------------------------------

--
-- Table structure for table `payements`
--

CREATE TABLE `payements` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `paid` float NOT NULL,
  `paidmethod` varchar(300) CHARACTER SET latin1 NOT NULL,
  `created_by` varchar(60) NOT NULL,
  `register_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `payment_suplls`
--

CREATE TABLE `payment_suplls` (
  `idd` int(11) NOT NULL,
  `sup_id` varchar(200) NOT NULL,
  `invoicen` varchar(200) NOT NULL,
  `purchaid` varchar(200) NOT NULL,
  `innvamt` varchar(200) NOT NULL,
  `amtpaid` varchar(200) NOT NULL,
  `balaccc` varchar(200) NOT NULL,
  `methid` varchar(200) NOT NULL,
  `bankname` varchar(200) NOT NULL,
  `chechno` varchar(200) NOT NULL,
  `bycrted` varchar(200) CHARACTER SET utf8 NOT NULL,
  `datetch` varchar(200) NOT NULL,
  `datet` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `permission_new`
--

CREATE TABLE `permission_new` (
  `iid` int(11) NOT NULL,
  `nname` varchar(200) CHARACTER SET utf8 NOT NULL,
  `ssv` varchar(1) NOT NULL,
  `ssa` varchar(1) NOT NULL,
  `sse` varchar(1) NOT NULL,
  `ssd` varchar(1) NOT NULL,
  `puv` varchar(1) NOT NULL,
  `pua` varchar(1) NOT NULL,
  `pue` varchar(1) NOT NULL,
  `pud` varchar(1) NOT NULL,
  `prv` varchar(1) NOT NULL,
  `pra` varchar(1) NOT NULL,
  `pre` varchar(1) NOT NULL,
  `prd` varchar(1) NOT NULL,
  `cuv` varchar(1) NOT NULL,
  `cua` varchar(1) NOT NULL,
  `cue` varchar(1) NOT NULL,
  `cud` varchar(1) NOT NULL,
  `suv` varchar(1) NOT NULL,
  `sua` varchar(1) NOT NULL,
  `sue` varchar(1) NOT NULL,
  `sud` varchar(1) NOT NULL,
  `caav` varchar(1) NOT NULL,
  `caaa` varchar(1) NOT NULL,
  `caae` varchar(1) NOT NULL,
  `caad` varchar(1) NOT NULL,
  `brv` varchar(1) NOT NULL,
  `bra` varchar(1) NOT NULL,
  `bre` varchar(1) NOT NULL,
  `brd` varchar(1) NOT NULL,
  `excv` varchar(1) NOT NULL,
  `exca` varchar(1) NOT NULL,
  `exce` varchar(1) NOT NULL,
  `excd` varchar(1) NOT NULL,
  `exxv` varchar(1) NOT NULL,
  `exxa` varchar(1) NOT NULL,
  `exxe` varchar(1) NOT NULL,
  `exxd` varchar(1) NOT NULL,
  `phv` varchar(1) NOT NULL,
  `pha` varchar(1) NOT NULL,
  `phe` varchar(1) NOT NULL,
  `phd` varchar(1) NOT NULL,
  `gov` varchar(1) NOT NULL,
  `goa` varchar(1) NOT NULL,
  `goe` varchar(1) NOT NULL,
  `god` varchar(1) NOT NULL,
  `stv` varchar(1) NOT NULL,
  `rev` varchar(1) NOT NULL,
  `sta` varchar(1) NOT NULL,
  `ddat` date NOT NULL,
  `salretv` varchar(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `permission_new`
--

INSERT INTO `permission_new` (`iid`, `nname`, `ssv`, `ssa`, `sse`, `ssd`, `puv`, `pua`, `pue`, `pud`, `prv`, `pra`, `pre`, `prd`, `cuv`, `cua`, `cue`, `cud`, `suv`, `sua`, `sue`, `sud`, `caav`, `caaa`, `caae`, `caad`, `brv`, `bra`, `bre`, `brd`, `excv`, `exca`, `exce`, `excd`, `exxv`, `exxa`, `exxe`, `exxd`, `phv`, `pha`, `phe`, `phd`, `gov`, `goa`, `goe`, `god`, `stv`, `rev`, `sta`, `ddat`, `salretv`) VALUES
(1, 'admin', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '', '0000-00-00', '1'),
(2, 'sales', '1', '1', '1', '1', '1', '1', '0', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '', '0000-00-00', '1');

-- --------------------------------------------------------

--
-- Table structure for table `physicals`
--

CREATE TABLE `physicals` (
  `id` int(11) NOT NULL,
  `storeid` varchar(200) NOT NULL,
  `date` date NOT NULL,
  `totitem` varchar(200) NOT NULL,
  `craeted` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `physivcal_stock`
--

CREATE TABLE `physivcal_stock` (
  `id` int(11) NOT NULL,
  `phy_id` varchar(200) NOT NULL,
  `storeid` varchar(200) NOT NULL,
  `produid` varchar(200) NOT NULL,
  `userid` varchar(200) CHARACTER SET utf8 NOT NULL,
  `qty` varchar(200) NOT NULL,
  `befqty` varchar(200) NOT NULL,
  `affqty` varchar(200) NOT NULL,
  `resonn` varchar(200) NOT NULL,
  `date` date NOT NULL,
  `status` varchar(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `posales`
--

CREATE TABLE `posales` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `price` float NOT NULL,
  `qt` int(6) NOT NULL,
  `status` tinyint(4) DEFAULT NULL,
  `register_id` int(11) DEFAULT NULL,
  `number` int(11) DEFAULT NULL,
  `user_id` varchar(200) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `posales`
--

INSERT INTO `posales` (`id`, `product_id`, `name`, `price`, `qt`, `status`, `register_id`, `number`, `user_id`) VALUES
(3080, 6, 'Sample Two', 120, 10, 1, 45, 2, '27'),
(3077, 6, 'Sample Two', 120, 1, 0, 45, 1, '27'),
(3081, 9, 'Shimla mirch Aaloo', 130, 2, 1, 45, 2, '27');

-- --------------------------------------------------------

--
-- Table structure for table `possalprs`
--

CREATE TABLE `possalprs` (
  `ats` int(11) NOT NULL,
  `producnum` varchar(200) NOT NULL,
  `prname` varchar(200) NOT NULL,
  `purrs` varchar(200) NOT NULL,
  `sellrs` varchar(200) NOT NULL,
  `qqty` varchar(200) NOT NULL,
  `cgstt` varchar(200) NOT NULL,
  `sgst` varchar(200) NOT NULL,
  `toto` varchar(200) NOT NULL,
  `userid` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `possalprs`
--

INSERT INTO `possalprs` (`ats`, `producnum`, `prname`, `purrs`, `sellrs`, `qqty`, `cgstt`, `sgst`, `toto`, `userid`) VALUES
(12, '10', 'Rice 500g', '50', '60', '100', '5', '5', '5000.00', '1');

-- --------------------------------------------------------

--
-- Table structure for table `possalprspp`
--

CREATE TABLE `possalprspp` (
  `ats` int(11) NOT NULL,
  `producnum` varchar(200) NOT NULL,
  `prname` varchar(200) NOT NULL,
  `purrs` varchar(200) NOT NULL,
  `sellrs` varchar(200) NOT NULL,
  `qqty` varchar(200) NOT NULL,
  `cgstt` varchar(200) NOT NULL,
  `sgst` varchar(200) NOT NULL,
  `toto` varchar(200) NOT NULL,
  `userid` varchar(200) NOT NULL,
  `ppid` varchar(200) NOT NULL,
  `ppitemid` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `possalprspp`
--

INSERT INTO `possalprspp` (`ats`, `producnum`, `prname`, `purrs`, `sellrs`, `qqty`, `cgstt`, `sgst`, `toto`, `userid`, `ppid`, `ppitemid`) VALUES
(21, '6', 'Sample Two', '100', '150', '110', '10', '10', '10000', '27', '109', '253'),
(22, '9', 'Shimla mirch Aaloo', '100', '120', '160', '15', '15', '15000', '27', '109', '254');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `code` varchar(20) CHARACTER SET latin1 NOT NULL,
  `name` varchar(25) NOT NULL,
  `brandd` varchar(100) NOT NULL,
  `category` varchar(20) CHARACTER SET latin1 NOT NULL,
  `cost` float NOT NULL,
  `tax` varchar(11) DEFAULT NULL,
  `description` text CHARACTER SET latin1,
  `price` float NOT NULL,
  `descountperr` varchar(2) NOT NULL,
  `photo` varchar(200) CHARACTER SET latin1 NOT NULL,
  `photothumb` varchar(500) CHARACTER SET latin1 DEFAULT NULL,
  `color` varchar(10) CHARACTER SET latin1 NOT NULL,
  `created_at` varchar(30) CHARACTER SET latin1 DEFAULT NULL,
  `modified_at` varchar(30) CHARACTER SET latin1 DEFAULT NULL,
  `type` tinyint(4) DEFAULT NULL,
  `alertqt` int(10) DEFAULT NULL,
  `supplier` varchar(200) CHARACTER SET latin1 DEFAULT NULL,
  `unit` varchar(100) DEFAULT NULL,
  `taxmethod` varchar(4) DEFAULT NULL,
  `h_stores` varchar(300) CHARACTER SET latin1 DEFAULT NULL,
  `sgst` varchar(10) NOT NULL,
  `hsn` varchar(100) NOT NULL,
  `igst` varchar(10) NOT NULL,
  `rrate` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `code`, `name`, `brandd`, `category`, `cost`, `tax`, `description`, `price`, `descountperr`, `photo`, `photothumb`, `color`, `created_at`, `modified_at`, `type`, `alertqt`, `supplier`, `unit`, `taxmethod`, `h_stores`, `sgst`, `hsn`, `igst`, `rrate`) VALUES
(8, '8', 'Sample Four', '1', '19', 5, '10', 'zasds', 5, '0', '', '', 'color07', '2017-12-02 11:43:57', '2017-12-02 11:43:57', 0, 55, '4', '5', '0', NULL, '10', 'dfgfd', '20', '5'),
(7, '7', 'Sample Three', '1', '19', 100, '10', 'asdasd', 120, '1', '', '', 'color07', '2017-12-02 11:43:45', '2017-12-02 11:43:45', 0, 1, '4', '1', '0', NULL, '10', 'dfg', '20', '130'),
(6, '6', 'Sample Two', '5', '19', 100, '10', 'asdsad', 150, '0', '', '', 'color07', '2017-12-02 11:43:29', '2017-12-02 11:43:29', 0, 1, '10', '1', '1', NULL, '10', '546', '20', '200'),
(5, '5', 'Sample one', '1', '23', 11, '12', '', 22, '1', '', '', 'color07', '2017-12-02 11:43:12', '2017-12-02 11:43:12', 0, 0, '10', '12', '1', NULL, '12', 'sdfsd', '24', '33'),
(9, '9', 'Shimla mirch Aaloo', '1', '19', 100, '15', 'zczxc', 120, '20', '', '', 'color07', '2017-11-29 14:52:33', '2017-11-29 14:52:33', 0, 1, '10', '1', '1', NULL, '15', 'sdf', '24', '150'),
(10, '10', 'Rice 500g', '1', '19', 50, '5', 'fsdfds', 60, '0', '', '', 'color07', '2017-12-09 12:01:20', '2017-12-09 12:01:20', 0, 1, '4', 'kg', '0', NULL, '5', 'rrc', '10', '100');

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` int(11) NOT NULL,
  `ref` varchar(11) CHARACTER SET latin1 NOT NULL,
  `date` date NOT NULL,
  `betot` varchar(200) NOT NULL,
  `cgst` varchar(200) NOT NULL,
  `sgst` varchar(200) NOT NULL,
  `total` float DEFAULT NULL,
  `paiddd` varchar(200) NOT NULL,
  `attachement` varchar(200) CHARACTER SET latin1 DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `status` tinyint(4) NOT NULL,
  `created_by` int(11) NOT NULL,
  `type` tinyint(4) NOT NULL,
  `store_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `note` varchar(200) CHARACTER SET latin1 DEFAULT NULL,
  `modified_at` varchar(50) CHARACTER SET latin1 DEFAULT NULL,
  `invno` varchar(200) NOT NULL,
  `purdat` date NOT NULL,
  `purtpy` varchar(200) NOT NULL,
  `invdat` varchar(200) NOT NULL,
  `invamt` varchar(200) NOT NULL,
  `discper` varchar(200) NOT NULL,
  `discamt` varchar(200) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `purchases`
--

INSERT INTO `purchases` (`id`, `ref`, `date`, `betot`, `cgst`, `sgst`, `total`, `paiddd`, `attachement`, `supplier_id`, `status`, `created_by`, `type`, `store_id`, `warehouse_id`, `note`, `modified_at`, `invno`, `purdat`, `purtpy`, `invdat`, `invamt`, `discper`, `discamt`) VALUES
(109, '1C151219535', '2017-12-02', '27000', '5150', '5150', 37300, '', '1', 9, 1, 1, 0, 1, 0, '', '2017-12-02', '2113', '2017-12-02', '0', '02-12-2017', '27000', '0', '0');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_items`
--

CREATE TABLE `purchase_items` (
  `id` int(11) NOT NULL,
  `warehouse_id` varchar(200) NOT NULL,
  `supplier` varchar(200) NOT NULL,
  `purchase_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `brandidd` varchar(100) NOT NULL,
  `qt` int(10) NOT NULL,
  `cost` float NOT NULL,
  `subtot` float NOT NULL,
  `cgst` varchar(100) NOT NULL,
  `sgst` varchar(100) NOT NULL,
  `ttcg` varchar(100) NOT NULL,
  `ttsg` varchar(100) NOT NULL,
  `ndate` date NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `purchase_items`
--

INSERT INTO `purchase_items` (`id`, `warehouse_id`, `supplier`, `purchase_id`, `product_id`, `brandidd`, `qt`, `cost`, `subtot`, `cgst`, `sgst`, `ttcg`, `ttsg`, `ndate`) VALUES
(253, '0', '9', 109, 6, '5', 110, 100, 10000, '10', '10', '', '', '2017-12-02'),
(254, '0', '9', 109, 9, '1', 160, 100, 15000, '15', '15', '', '', '2017-12-02');

-- --------------------------------------------------------

--
-- Table structure for table `registers`
--

CREATE TABLE `registers` (
  `id` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` tinyint(4) NOT NULL,
  `user_id` int(11) NOT NULL,
  `cash_total` float DEFAULT NULL,
  `cash_sub` float DEFAULT NULL,
  `cc_total` float DEFAULT NULL,
  `cc_sub` float DEFAULT NULL,
  `cheque_total` float DEFAULT NULL,
  `cheque_sub` float DEFAULT NULL,
  `cash_inhand` float DEFAULT NULL,
  `note` text,
  `closed_at` varchar(150) DEFAULT NULL,
  `closed_by` int(11) DEFAULT NULL,
  `store_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `registers`
--

INSERT INTO `registers` (`id`, `date`, `status`, `user_id`, `cash_total`, `cash_sub`, `cc_total`, `cc_sub`, `cheque_total`, `cheque_sub`, `cash_inhand`, `note`, `closed_at`, `closed_by`, `store_id`) VALUES
(34, '2017-08-21 08:06:04', 0, 1, 3304, 3304, 660.8, 660.8, 0, 0, 100, '', '2017-09-04 15:28:19', 1, 1),
(36, '2017-09-04 10:19:04', 0, 1, 26699.5, 26699.5, 55.6, 55.6, 0, 0, 1000, '', '2017-09-15 19:04:46', 1, 1),
(42, '2017-10-28 07:19:55', 0, 1, 0, 0, 0, 0, 0, 0, 100, '', '2017-11-25 16:48:15', 1, 10),
(38, '2017-09-15 13:34:59', 0, 1, 2500, 2500, 0, 0, 0, 0, 15000, '', '2017-12-08 14:19:19', 1, 1),
(43, '2017-11-25 11:16:29', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 0),
(44, '2017-11-25 11:16:32', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 0),
(45, '2017-12-08 08:49:34', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 5000, NULL, NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `report_stting`
--

CREATE TABLE `report_stting` (
  `rsi` int(11) NOT NULL,
  `r1` varchar(1) NOT NULL,
  `r2` varchar(1) NOT NULL,
  `r3` varchar(1) NOT NULL,
  `r4` varchar(1) NOT NULL,
  `r5` varchar(1) NOT NULL,
  `r6` varchar(1) NOT NULL,
  `r7` varchar(1) NOT NULL,
  `r8` varchar(1) NOT NULL,
  `r9` varchar(1) NOT NULL,
  `r10` varchar(1) NOT NULL,
  `r11` varchar(1) NOT NULL,
  `r12` varchar(1) NOT NULL,
  `r13` varchar(1) NOT NULL,
  `r14` varchar(1) NOT NULL,
  `r15` varchar(1) NOT NULL,
  `r16` varchar(1) NOT NULL,
  `r17` varchar(1) NOT NULL,
  `r18` varchar(1) NOT NULL,
  `rdate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `report_stting`
--

INSERT INTO `report_stting` (`rsi`, `r1`, `r2`, `r3`, `r4`, `r5`, `r6`, `r7`, `r8`, `r9`, `r10`, `r11`, `r12`, `r13`, `r14`, `r15`, `r16`, `r17`, `r18`, `rdate`) VALUES
(1, '1', '1', '1', '1', '1', '1', '', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '2017-11-06');

-- --------------------------------------------------------

--
-- Table structure for table `retunn_items`
--

CREATE TABLE `retunn_items` (
  `idd` int(11) NOT NULL,
  `ret_id` varchar(200) NOT NULL,
  `sl_id` varchar(200) NOT NULL,
  `sl_newqt` varchar(200) NOT NULL,
  `sl_subtotal` varchar(200) NOT NULL,
  `todatt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `returnss`
--

CREATE TABLE `returnss` (
  `re_id` int(11) NOT NULL,
  `re_sales_id` varchar(300) NOT NULL,
  `discper` varchar(10) NOT NULL,
  `discamt` varchar(200) NOT NULL,
  `sutott` varchar(200) NOT NULL,
  `tootal` varchar(200) NOT NULL,
  `iteems` varchar(30) NOT NULL,
  `retrn_amt_mtd` varchar(200) NOT NULL,
  `retun_amt_stas` varchar(1) NOT NULL,
  `date_retun` datetime NOT NULL,
  `purcha_sales_id` varchar(200) NOT NULL,
  `todate` date NOT NULL,
  `storeid` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `rolls`
--

CREATE TABLE `rolls` (
  `r_id` int(11) NOT NULL,
  `r_name` varchar(100) CHARACTER SET utf8 NOT NULL,
  `r_stas` varchar(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `rolls`
--

INSERT INTO `rolls` (`r_id`, `r_name`, `r_stas`) VALUES
(1, 'admin', '1'),
(2, 'sales', '1');

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `clientname` varchar(50) NOT NULL,
  `tax` varchar(5) DEFAULT NULL,
  `discount` varchar(5) DEFAULT NULL,
  `subtotal` varchar(15) NOT NULL,
  `discount_indujul` varchar(200) NOT NULL,
  `total` float NOT NULL,
  `created_at` date NOT NULL,
  `attime` datetime NOT NULL,
  `selddate` date NOT NULL,
  `modified_at` varchar(150) DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  `created_by` varchar(50) NOT NULL,
  `totalitems` int(20) NOT NULL,
  `paid` varchar(15) DEFAULT NULL,
  `paidmethod` varchar(700) DEFAULT NULL,
  `taxamount` float DEFAULT NULL,
  `discountamount` float DEFAULT NULL,
  `register_id` int(11) DEFAULT NULL,
  `firstpayement` float DEFAULT NULL,
  `sgsttaxamt` varchar(200) NOT NULL,
  `lalid` varchar(200) NOT NULL,
  `lalamt` varchar(200) NOT NULL,
  `recivamt` varchar(200) NOT NULL,
  `ballamtt` varchar(200) NOT NULL,
  `yyear` varchar(100) NOT NULL,
  `custrrf` varchar(100) NOT NULL,
  `mobnnm` varchar(15) NOT NULL,
  `custstattype` varchar(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`id`, `client_id`, `clientname`, `tax`, `discount`, `subtotal`, `discount_indujul`, `total`, `created_at`, `attime`, `selddate`, `modified_at`, `status`, `created_by`, `totalitems`, `paid`, `paidmethod`, `taxamount`, `discountamount`, `register_id`, `firstpayement`, `sgsttaxamt`, `lalid`, `lalamt`, `recivamt`, `ballamtt`, `yyear`, `custrrf`, `mobnnm`, `custstattype`) VALUES
(1, 0, 'Walk in Customer', '10%', '0', '2500.00', '0.00', 2500, '2017-12-02', '2017-12-02 11:44:31', '0000-00-00', NULL, 0, 'admin Doe', 20, '2500.00', '0', 0, 0, 38, 2500, '0.00', '0', '0', '2600', '100.00', '1718', '9633', '9638527418', '1'),
(2, 0, 'Walk in Customer', '10%', '0', '260.00', '0.00', 260, '2017-12-08', '2017-12-08 15:32:47', '0000-00-00', NULL, 0, 'demo ', 2, '260.00', '0', 0, 0, 45, 260, '0.00', '0', '0', '300', '40.00', '1718', '', '', '1');

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `perprice` varchar(200) NOT NULL,
  `price` float NOT NULL,
  `qt` int(6) NOT NULL,
  `subtotal` varchar(20) NOT NULL,
  `date` date DEFAULT NULL,
  `cgst` varchar(20) NOT NULL,
  `sgst` varchar(20) NOT NULL,
  `tottax` varchar(200) NOT NULL,
  `dis_per` varchar(200) NOT NULL,
  `dis_amt` varchar(200) NOT NULL,
  `mrpp` varchar(200) NOT NULL,
  `subtotal2` varchar(200) NOT NULL,
  `igstt` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `sale_items`
--

INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `name`, `perprice`, `price`, `qt`, `subtotal`, `date`, `cgst`, `sgst`, `tottax`, `dis_per`, `dis_amt`, `mrpp`, `subtotal2`, `igstt`) VALUES
(1, 1, 6, 'Sample Two', '100', 120, 10, '1200', '2017-12-02', '10', '10', '20', '0', '0', '200', '1500', '0'),
(2, 1, 9, 'Shimla mirch Aaloo', '100', 130, 10, '1300', '2017-12-02', '15', '15', '30', '0', '0', '150', '1200', '0'),
(3, 2, 9, 'Shimla mirch Aaloo', '100', 130, 2, '260', '2017-12-08', '15', '15', '30', '0', '0', '150', '240', '0');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `companyname` varchar(100) NOT NULL,
  `logo` varchar(200) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `keyboard` tinyint(1) NOT NULL,
  `receiptheader` text,
  `receiptfooter` text NOT NULL,
  `theme` varchar(20) NOT NULL,
  `discount` varchar(5) DEFAULT NULL,
  `tax` varchar(5) DEFAULT NULL,
  `timezone` varchar(400) DEFAULT NULL,
  `language` varchar(30) DEFAULT NULL,
  `stripe` tinyint(4) DEFAULT NULL,
  `stripe_secret_key` varchar(150) DEFAULT NULL,
  `stripe_publishable_key` varchar(150) DEFAULT NULL,
  `decimals` int(2) DEFAULT NULL,
  `disc_pro` varchar(1) NOT NULL,
  `disc_all` varchar(1) NOT NULL,
  `gst_tax` varchar(1) NOT NULL,
  `destpp` varchar(1) NOT NULL,
  `smsset` varchar(1) NOT NULL,
  `mystate` varchar(10) NOT NULL,
  `phoneex2` varchar(1) NOT NULL,
  `paskall` varchar(200) NOT NULL,
  `printersizew` varchar(3) NOT NULL,
  `pptt` varchar(3) NOT NULL,
  `igsttax` varchar(1) NOT NULL,
  `warstore` varchar(1) NOT NULL,
  `ddsp` varchar(1) NOT NULL,
  `regidd` varchar(10) NOT NULL,
  `ddspct` varchar(1) NOT NULL,
  `gstnoo` varchar(200) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `companyname`, `logo`, `phone`, `currency`, `keyboard`, `receiptheader`, `receiptfooter`, `theme`, `discount`, `tax`, `timezone`, `language`, `stripe`, `stripe_secret_key`, `stripe_publishable_key`, `decimals`, `disc_pro`, `disc_all`, `gst_tax`, `destpp`, `smsset`, `mystate`, `phoneex2`, `paskall`, `printersizew`, `pptt`, `igsttax`, `warstore`, `ddsp`, `regidd`, `ddspct`, `gstnoo`) VALUES
(1, 'POS ', 'e28f75f9c8446776f8199373f02e2e48.png', '9176791477', 'INR', 0, '', 'Thank You For Business', 'Light', '0', '0', 'Asia/Kolkata', 'english', 1, 'karunakaran', 'karunakaran', 2, '0', '1', '1', '2', '2', '21', '1', 'b4b27ce140bf9870b167af20e3cb5a2d', '3', '1', '1', '0', '0', '1718', '0', '');

-- --------------------------------------------------------

--
-- Table structure for table `smstabble`
--

CREATE TABLE `smstabble` (
  `si` int(11) NOT NULL,
  `serurl` varchar(200) NOT NULL,
  `authkey` varchar(200) NOT NULL,
  `sendid` varchar(200) NOT NULL,
  `routid` varchar(200) NOT NULL,
  `timeupdated` date NOT NULL,
  `status` varchar(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `smstabble`
--

INSERT INTO `smstabble` (`si`, `serurl`, `authkey`, `sendid`, `routid`, `timeupdated`, `status`) VALUES
(1, 'sms.codetechnology.in', '6cf3b6a45294458ad93a494517c049', 'SMSAPK', '1', '2017-12-09', '1');

-- --------------------------------------------------------

--
-- Table structure for table `state`
--

CREATE TABLE `state` (
  `StateID` int(11) NOT NULL,
  `CountryID` int(11) NOT NULL,
  `StateName` varchar(50) NOT NULL,
  `Notes` longtext,
  `ChangedBy` varchar(50) DEFAULT NULL,
  `ChangeDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `state`
--

INSERT INTO `state` (`StateID`, `CountryID`, `StateName`, `Notes`, `ChangedBy`, `ChangeDate`) VALUES
(1, 1, 'ANDHRA PRADESH', NULL, 'Nieanjan', '2017-11-23 15:44:02'),
(2, 1, 'ASSAM', NULL, 'Nieanjan', '2017-11-23 15:44:02'),
(3, 1, 'ARUNACHAL PRADESH', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(4, 1, 'GUJRAT', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(5, 1, 'BIHAR', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(6, 1, 'HARYANA', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(7, 1, 'HIMACHAL PRADESH', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(8, 1, 'JAMMU & KASHMIR', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(9, 1, 'KARNATAKA', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(10, 1, 'KERALA', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(11, 1, 'MADHYA PRADESH', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(12, 1, 'MAHARASHTRA', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(13, 1, 'MANIPUR', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(14, 1, 'MEGHALAYA', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(15, 1, 'MIZORAM', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(16, 1, 'NAGALAND', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(17, 1, 'ORISSA', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(18, 1, 'PUNJAB', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(19, 1, 'RAJASTHAN', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(20, 1, 'SIKKIM', NULL, 'Nieanjan', '2017-11-23 15:44:03'),
(21, 1, 'TAMIL NADU', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(22, 1, 'TRIPURA', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(23, 1, 'UTTAR PRADESH', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(24, 1, 'WEST BENGAL', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(25, 1, 'DELHI', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(26, 1, 'GOA', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(27, 1, 'PONDICHERY', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(28, 1, 'LAKSHDWEEP', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(29, 1, 'DAMAN & DIU', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(30, 1, 'DADRA & NAGAR', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(31, 1, 'CHANDIGARH', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(32, 1, 'ANDAMAN & NICOBAR', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(33, 1, 'UTTARANCHAL', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(34, 1, 'JHARKHAND', NULL, 'Nieanjan', '2017-11-23 15:44:04'),
(35, 1, 'CHATTISGARH', NULL, 'Nieanjan', '2017-11-23 15:44:04');

-- --------------------------------------------------------

--
-- Table structure for table `stocks`
--

CREATE TABLE `stocks` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `type` tinyint(4) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `quantity` int(10) DEFAULT NULL,
  `price` float DEFAULT NULL,
  `puritem_id` varchar(200) NOT NULL,
  `datte` date NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `stocks`
--

INSERT INTO `stocks` (`id`, `product_id`, `type`, `store_id`, `warehouse_id`, `quantity`, `price`, `puritem_id`, `datte`) VALUES
(27, 6, 0, 1, 0, 100, 100, '109', '0000-00-00'),
(28, 9, 0, 1, 0, 148, 100, '109', '0000-00-00'),
(29, 10, 0, 1, 0, 0, 0, '', '2017-12-09');

-- --------------------------------------------------------

--
-- Table structure for table `stock_daily`
--

CREATE TABLE `stock_daily` (
  `s_id` int(11) NOT NULL,
  `sdate` date NOT NULL,
  `sstore` varchar(200) NOT NULL,
  `sproid` varchar(200) NOT NULL,
  `sopening` varchar(200) NOT NULL,
  `spurchase` varchar(200) NOT NULL,
  `initialper` varchar(200) NOT NULL,
  `ssales` varchar(200) NOT NULL,
  `sreturn` varchar(200) NOT NULL,
  `sadjestmet` varchar(200) NOT NULL,
  `sdispaced` varchar(200) NOT NULL,
  `sclosig` varchar(200) NOT NULL,
  `datetimee` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `stock_daily`
--

INSERT INTO `stock_daily` (`s_id`, `sdate`, `sstore`, `sproid`, `sopening`, `spurchase`, `initialper`, `ssales`, `sreturn`, `sadjestmet`, `sdispaced`, `sclosig`, `datetimee`) VALUES
(11, '2017-11-30', '1', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(12, '2017-11-30', '1', '6', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(13, '2017-11-30', '1', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(14, '2017-11-30', '1', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(15, '2017-11-30', '1', '9', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(16, '2017-12-01', '1', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(17, '2017-12-01', '1', '6', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(18, '2017-12-01', '1', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(19, '2017-12-01', '1', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(20, '2017-12-01', '1', '9', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(21, '2017-12-03', '1', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-04 16:51:52'),
(22, '2017-12-03', '1', '6', '', '0', '0', '0', '0', '0', '0', '100', '2017-12-04 16:51:52'),
(23, '2017-12-03', '1', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-04 16:51:52'),
(24, '2017-12-03', '1', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-04 16:51:52'),
(25, '2017-12-03', '1', '9', '', '0', '0', '0', '0', '0', '0', '150', '2017-12-04 16:51:52'),
(26, '2017-12-06', '1', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-07 15:55:50'),
(27, '2017-12-06', '1', '6', '', '0', '0', '0', '0', '0', '0', '100', '2017-12-07 15:55:50'),
(28, '2017-12-06', '1', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-07 15:55:50'),
(29, '2017-12-06', '1', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-07 15:55:50'),
(30, '2017-12-06', '1', '9', '', '0', '0', '0', '0', '0', '0', '150', '2017-12-07 15:55:50'),
(31, '2017-12-07', '1', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-08 14:11:10'),
(32, '2017-12-07', '1', '6', '100', '0', '0', '0', '0', '0', '0', '100', '2017-12-08 14:11:10'),
(33, '2017-12-07', '1', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-08 14:11:10'),
(34, '2017-12-07', '1', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-08 14:11:10'),
(35, '2017-12-07', '1', '9', '150', '0', '0', '0', '0', '0', '0', '150', '2017-12-08 14:11:10'),
(36, '2017-12-08', '1', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-09 10:05:25'),
(37, '2017-12-08', '1', '6', '100', '0', '0', '0', '0', '0', '0', '100', '2017-12-09 10:05:25'),
(38, '2017-12-08', '1', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-09 10:05:25'),
(39, '2017-12-08', '1', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-09 10:05:25'),
(40, '2017-12-08', '1', '9', '150', '0', '0', '2', '0', '0', '0', '148', '2017-12-09 10:05:25'),
(41, '2017-12-08', '1', '10', '', '0', '0', '0', '0', '0', '0', '0', '2017-12-09 12:01:25');

-- --------------------------------------------------------

--
-- Table structure for table `stock_dailypro`
--

CREATE TABLE `stock_dailypro` (
  `s_id` int(11) NOT NULL,
  `sdate` date NOT NULL,
  `sstore` varchar(200) NOT NULL,
  `sproid` varchar(200) NOT NULL,
  `sopening` varchar(200) NOT NULL,
  `spurchase` varchar(200) NOT NULL,
  `initialper` varchar(200) NOT NULL,
  `ssales` varchar(200) NOT NULL,
  `sreturn` varchar(200) NOT NULL,
  `sadjestmet` varchar(200) NOT NULL,
  `sdispaced` varchar(200) NOT NULL,
  `sclosig` varchar(200) NOT NULL,
  `datetimee` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `stock_dailypro`
--

INSERT INTO `stock_dailypro` (`s_id`, `sdate`, `sstore`, `sproid`, `sopening`, `spurchase`, `initialper`, `ssales`, `sreturn`, `sadjestmet`, `sdispaced`, `sclosig`, `datetimee`) VALUES
(11, '2017-11-30', '', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(12, '2017-11-30', '', '6', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(13, '2017-11-30', '', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(14, '2017-11-30', '', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(15, '2017-11-30', '', '9', '', '0', '0', '0', '0', '0', '0', '', '2017-12-01 19:13:06'),
(16, '2017-12-01', '', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(17, '2017-12-01', '', '6', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(18, '2017-12-01', '', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(19, '2017-12-01', '', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(20, '2017-12-01', '', '9', '', '0', '0', '0', '0', '0', '0', '', '2017-12-02 11:42:01'),
(21, '2017-12-03', '', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-04 16:51:52'),
(22, '2017-12-03', '', '6', '', '0', '0', '0', '0', '0', '0', '100', '2017-12-04 16:51:52'),
(23, '2017-12-03', '', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-04 16:51:52'),
(24, '2017-12-03', '', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-04 16:51:52'),
(25, '2017-12-03', '', '9', '', '0', '0', '0', '0', '0', '0', '150', '2017-12-04 16:51:52'),
(26, '2017-12-06', '', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-07 15:55:50'),
(27, '2017-12-06', '', '6', '', '0', '0', '0', '0', '0', '0', '100', '2017-12-07 15:55:50'),
(28, '2017-12-06', '', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-07 15:55:50'),
(29, '2017-12-06', '', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-07 15:55:50'),
(30, '2017-12-06', '', '9', '', '0', '0', '0', '0', '0', '0', '150', '2017-12-07 15:55:50'),
(31, '2017-12-07', '', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-08 14:11:10'),
(32, '2017-12-07', '', '6', '100', '0', '0', '0', '0', '0', '0', '100', '2017-12-08 14:11:10'),
(33, '2017-12-07', '', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-08 14:11:10'),
(34, '2017-12-07', '', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-08 14:11:10'),
(35, '2017-12-07', '', '9', '150', '0', '0', '0', '0', '0', '0', '150', '2017-12-08 14:11:10'),
(36, '2017-12-08', '', '5', '', '0', '0', '0', '0', '0', '0', '', '2017-12-09 10:05:25'),
(37, '2017-12-08', '', '6', '100', '0', '0', '0', '0', '0', '0', '100', '2017-12-09 10:05:25'),
(38, '2017-12-08', '', '7', '', '0', '0', '0', '0', '0', '0', '', '2017-12-09 10:05:25'),
(39, '2017-12-08', '', '8', '', '0', '0', '0', '0', '0', '0', '', '2017-12-09 10:05:25'),
(40, '2017-12-08', '', '9', '150', '0', '0', '2', '0', '0', '0', '148', '2017-12-09 10:05:25'),
(41, '2017-12-08', '', '10', '', '0', '0', '0', '0', '0', '0', '0', '2017-12-09 12:01:25');

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfer`
--

CREATE TABLE `stock_transfer` (
  `st_no` int(11) NOT NULL,
  `war_id` varchar(200) NOT NULL,
  `store_id` varchar(200) NOT NULL,
  `pro_id` varchar(200) NOT NULL,
  `qty` varchar(200) NOT NULL,
  `tyoftrans` varchar(200) NOT NULL,
  `date` date NOT NULL,
  `bywhom` varchar(200) CHARACTER SET utf8 NOT NULL,
  `perselphy_ids` varchar(200) NOT NULL,
  `perchaseid` varchar(200) NOT NULL,
  `peritemid` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `stock_transfer`
--

INSERT INTO `stock_transfer` (`st_no`, `war_id`, `store_id`, `pro_id`, `qty`, `tyoftrans`, `date`, `bywhom`, `perselphy_ids`, `perchaseid`, `peritemid`) VALUES
(1, '0', '1', '6', '110', '1', '2017-12-02', '1', '0', '109', '253'),
(2, '0', '1', '9', '160', '1', '2017-12-02', '1', '0', '109', '254'),
(3, '0', '1', '6', '10', '2', '2017-12-02', 'admin Doe', '0', '', ''),
(4, '0', '1', '9', '10', '2', '2017-12-02', 'admin Doe', '0', '', ''),
(5, '0', '1', '9', '2', '2', '2017-12-08', 'demo ', '0', '', ''),
(6, '', '1', '10', '0', '5', '2017-12-09', 'admin Doe', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `stores`
--

CREATE TABLE `stores` (
  `id` int(11) NOT NULL,
  `name` varchar(40) NOT NULL,
  `email` varchar(40) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `adresse` varchar(400) DEFAULT NULL,
  `footer_text` varchar(400) DEFAULT NULL,
  `city` varchar(20) DEFAULT NULL,
  `country` varchar(20) DEFAULT NULL,
  `created_at` varchar(200) NOT NULL,
  `status` tinyint(4) DEFAULT NULL,
  `disc_pro` varchar(1) NOT NULL,
  `disc_all` varchar(1) NOT NULL,
  `gst_tax` varchar(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `stores`
--

INSERT INTO `stores` (`id`, `name`, `email`, `phone`, `adresse`, `footer_text`, `city`, `country`, `created_at`, `status`, `disc_pro`, `disc_all`, `gst_tax`) VALUES
(1, 'Local Store', 'store@codetechnology.in', '+9176791477', 'Urban White Apartments,\r\nFlat No.T1, 3rd Floor, No.8/75, Murugappa Street,\r\nPursawalkam, Chennai - 600 007.', 'Custome Footer for dal web store', 'Chennai', 'India', '2016-05-10 12:44:33', 1, '1', '1', '1');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `note` text,
  `created_at` varchar(150) CHARACTER SET latin1 NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `phone`, `email`, `note`, `created_at`) VALUES
(4, 'Supplier One', '8989565623', 'supla@yahoo.com', 'gsdfgfdfgdf', '2017-09-12 09:49:52'),
(10, 'reena', '67798', 're@gmail.com', '', '2017-10-28 10:59:33'),
(8, 'Suman', '87867689', 'su@gmail.com', '', '2017-10-28 10:58:44'),
(9, 'karthik', '8767789', 'ka@gmail.com', '', '2017-10-28 10:59:03'),
(11, 'mohan', '768789897', 'mo@gmail.com', '', '2017-10-29 16:48:01');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(45) NOT NULL,
  `firstname` varchar(100) NOT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `hashed_password` varchar(128) NOT NULL,
  `email` varchar(60) DEFAULT NULL,
  `useraddr` varchar(500) NOT NULL,
  `role` varchar(20) NOT NULL,
  `last_active` varchar(50) DEFAULT NULL,
  `avatar` varchar(200) DEFAULT NULL,
  `created_at` varchar(300) DEFAULT NULL,
  `store_id` varchar(200) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `firstname`, `lastname`, `hashed_password`, `email`, `useraddr`, `role`, `last_active`, `avatar`, `created_at`, `store_id`) VALUES
(1, 'admin', 'admin', 'Doe', 'ede719c5ff6172692b6d811363e011f686229344f55662cb5493b4300403c237ad7b80fdd6a392e467850b6e338a523ea752f102d04968c8594efde2757b1f79', 'admin@dar-elweb.com', '', 'admin', '2017-12-08 14:30:42', '9fff9cc26e539214e9a5fd3b6a10cde9.jpg', '2016-08-28 15:01:23', ''),
(27, 'demo', 'demo', '', '60a0b4219f334e8ff8e3a072fb07a0fe380539db2777eb42acd0cd0a4146caa1ff044b82ac0b628dc15504a9b9d797202ff4294222b56163dcf61b688d2a6e26', '', '', 'admin', '2017-12-08 14:30:36', NULL, '2017-12-08 14:30:22', '1');

-- --------------------------------------------------------

--
-- Table structure for table `variations`
--

CREATE TABLE `variations` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `price` float DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `adresse` varchar(400) DEFAULT NULL,
  `created_at` varchar(200) CHARACTER SET latin1 NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `name`, `phone`, `email`, `adresse`, `created_at`) VALUES
(3, 'new', '999999', '9991@gmail.com', 'saddasdsa', '2017-09-04 15:26:53');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aaaa`
--
ALTER TABLE `aaaa`
  ADD PRIMARY KEY (`dd`);

--
-- Indexes for table `brand`
--
ALTER TABLE `brand`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categorie_expences`
--
ALTER TABLE `categorie_expences`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `combo_items`
--
ALTER TABLE `combo_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `countries`
--
ALTER TABLE `countries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `expences`
--
ALTER TABLE `expences`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `goodsitems`
--
ALTER TABLE `goodsitems`
  ADD PRIMARY KEY (`idd`);

--
-- Indexes for table `goodsout`
--
ALTER TABLE `goodsout`
  ADD PRIMARY KEY (`idd`);

--
-- Indexes for table `holds`
--
ALTER TABLE `holds`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payements`
--
ALTER TABLE `payements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payment_suplls`
--
ALTER TABLE `payment_suplls`
  ADD PRIMARY KEY (`idd`);

--
-- Indexes for table `permission_new`
--
ALTER TABLE `permission_new`
  ADD PRIMARY KEY (`iid`);

--
-- Indexes for table `physicals`
--
ALTER TABLE `physicals`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `physivcal_stock`
--
ALTER TABLE `physivcal_stock`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `posales`
--
ALTER TABLE `posales`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `possalprs`
--
ALTER TABLE `possalprs`
  ADD PRIMARY KEY (`ats`);

--
-- Indexes for table `possalprspp`
--
ALTER TABLE `possalprspp`
  ADD PRIMARY KEY (`ats`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `purchase_items`
--
ALTER TABLE `purchase_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `registers`
--
ALTER TABLE `registers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `report_stting`
--
ALTER TABLE `report_stting`
  ADD PRIMARY KEY (`rsi`);

--
-- Indexes for table `retunn_items`
--
ALTER TABLE `retunn_items`
  ADD PRIMARY KEY (`idd`);

--
-- Indexes for table `returnss`
--
ALTER TABLE `returnss`
  ADD PRIMARY KEY (`re_id`);

--
-- Indexes for table `rolls`
--
ALTER TABLE `rolls`
  ADD PRIMARY KEY (`r_id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `smstabble`
--
ALTER TABLE `smstabble`
  ADD PRIMARY KEY (`si`);

--
-- Indexes for table `state`
--
ALTER TABLE `state`
  ADD PRIMARY KEY (`StateID`);

--
-- Indexes for table `stocks`
--
ALTER TABLE `stocks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stock_daily`
--
ALTER TABLE `stock_daily`
  ADD PRIMARY KEY (`s_id`);

--
-- Indexes for table `stock_dailypro`
--
ALTER TABLE `stock_dailypro`
  ADD PRIMARY KEY (`s_id`);

--
-- Indexes for table `stock_transfer`
--
ALTER TABLE `stock_transfer`
  ADD PRIMARY KEY (`st_no`);

--
-- Indexes for table `stores`
--
ALTER TABLE `stores`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `aaaa`
--
ALTER TABLE `aaaa`
  MODIFY `dd` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
--
-- AUTO_INCREMENT for table `brand`
--
ALTER TABLE `brand`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;
--
-- AUTO_INCREMENT for table `categorie_expences`
--
ALTER TABLE `categorie_expences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
--
-- AUTO_INCREMENT for table `combo_items`
--
ALTER TABLE `combo_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
--
-- AUTO_INCREMENT for table `countries`
--
ALTER TABLE `countries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;
--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;
--
-- AUTO_INCREMENT for table `expences`
--
ALTER TABLE `expences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;
--
-- AUTO_INCREMENT for table `goodsitems`
--
ALTER TABLE `goodsitems`
  MODIFY `idd` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `goodsout`
--
ALTER TABLE `goodsout`
  MODIFY `idd` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `holds`
--
ALTER TABLE `holds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=254;
--
-- AUTO_INCREMENT for table `payements`
--
ALTER TABLE `payements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;
--
-- AUTO_INCREMENT for table `payment_suplls`
--
ALTER TABLE `payment_suplls`
  MODIFY `idd` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `permission_new`
--
ALTER TABLE `permission_new`
  MODIFY `iid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `physicals`
--
ALTER TABLE `physicals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `physivcal_stock`
--
ALTER TABLE `physivcal_stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `posales`
--
ALTER TABLE `posales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3082;
--
-- AUTO_INCREMENT for table `possalprs`
--
ALTER TABLE `possalprs`
  MODIFY `ats` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
--
-- AUTO_INCREMENT for table `possalprspp`
--
ALTER TABLE `possalprspp`
  MODIFY `ats` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;
--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=110;
--
-- AUTO_INCREMENT for table `purchase_items`
--
ALTER TABLE `purchase_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=255;
--
-- AUTO_INCREMENT for table `registers`
--
ALTER TABLE `registers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;
--
-- AUTO_INCREMENT for table `report_stting`
--
ALTER TABLE `report_stting`
  MODIFY `rsi` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT for table `retunn_items`
--
ALTER TABLE `retunn_items`
  MODIFY `idd` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT for table `returnss`
--
ALTER TABLE `returnss`
  MODIFY `re_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `rolls`
--
ALTER TABLE `rolls`
  MODIFY `r_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `smstabble`
--
ALTER TABLE `smstabble`
  MODIFY `si` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT for table `state`
--
ALTER TABLE `state`
  MODIFY `StateID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;
--
-- AUTO_INCREMENT for table `stocks`
--
ALTER TABLE `stocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;
--
-- AUTO_INCREMENT for table `stock_daily`
--
ALTER TABLE `stock_daily`
  MODIFY `s_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;
--
-- AUTO_INCREMENT for table `stock_dailypro`
--
ALTER TABLE `stock_dailypro`
  MODIFY `s_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;
--
-- AUTO_INCREMENT for table `stock_transfer`
--
ALTER TABLE `stock_transfer`
  MODIFY `st_no` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
--
-- AUTO_INCREMENT for table `stores`
--
ALTER TABLE `stores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
