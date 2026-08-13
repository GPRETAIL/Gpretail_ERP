<?php
defined('BASEPATH') or exit('No direct script access allowed');

class Quotation extends MY_Controller
{

    function __construct()
    {
        
        parent::__construct();
        if (! $this->user) {
            redirect('login');
        }
       
       

        $this->register = $this->session->userdata('register') ? $this->session->userdata('register') : FALSE;
        $this->store = $this->session->userdata('store') ? $this->session->userdata('store') : FALSE;
        $this->load->database();

        $this->load->helper('url');
    }

    public function index()
    {
      
     /* $products = Product::all();
      if($this->register){
         $register = Register::find($this->register);
         foreach ($products as $product) {
            if($product->type == '0'){
               $stock = Stock::find('first', array('conditions' => array('store_id = ? AND product_id = ?', $register->store_id, $product->id)));
               $price = $stock ? ($stock->price > 0 ? $stock->price : $product->price) :$product->price;
               $product->price = $price;
            }
         }
      }*/
      $rolr=$this->user->role;
      $tgtg=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));
      $this->view_data['kkar'] = $tgtg;

      $xzxz=mysql_fetch_array(mysql_query("select * from report_stting  where rsi=1 "));
      $this->view_data['xzxz'] = $xzxz; 

      $imnn=mysql_query("select * from brand order by name asc");
      $this->view_data['imnn'] = $imnn;

      $taxx=mysql_query("select * from tax order by name asc");
      $this->view_data['taxx'] = $taxx;

      @$oii=mysql_fetch_array(mysql_query("select * from settings where id=1 "));

      $this->view_data['oii'] = $oii;
      $this->view_data['suppliers'] = Supplier::all();



        date_default_timezone_set($this->setting->timezone);
        $this->view_data['customers'] = Customer::all();
       /* $this->view_data['products'] = $products;*/
        $this->view_data['categories'] = Category::all();
        $this->view_data['Stores'] = Store::all();
        if (! Posale::first()) {
            $hold = Hold::last();
            if ($hold)
                $hold->update_attributes(array(
                    'time' => date("H:i")
                ));
        }
        $this->content_view = 'qpos';
    }


public function qindex($rff)
{



$mkmpp=mysql_fetch_object(mysql_query("select * from saleqs where id='".$rff."' "));
if($mkmpp->sal_id!=0)
{
redirect("");
}


  


mysql_query("update  posales set status=0 where user_id='".$this->session->userdata('user_id')."' and qt_id=0 ");
mysql_query("delete  from  posales  where user_id='".$this->session->userdata('user_id')."' and qt_id!=0 ");

      $ssmk=mysql_query("select * from sale_itemqs where sale_id='".$rff."' ");
      while($ssmkf=mysql_fetch_array($ssmk))
      {
        mysql_query("insert into posales set 
          product_id='".$ssmkf['product_id']."' ,
          name='".$ssmkf['name']."' ,
          price='".$ssmkf['price']."' ,
          qt='".$ssmkf['qt']."' ,
          status=1,
          register_id='".$this->register."' ,
          number=1,
          user_id='".$this->session->userdata('user_id')."' ,
          qt_id='".$rff."'    ");
      }

      $rolr=$this->user->role;
      $tgtg=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));
      $this->view_data['kkar'] = $tgtg;

      $xzxz=mysql_fetch_array(mysql_query("select * from report_stting  where rsi=1 "));
      $this->view_data['xzxz'] = $xzxz; 

      $imnn=mysql_query("select * from brand order by name asc");
      $this->view_data['imnn'] = $imnn;

      $taxx=mysql_query("select * from tax order by name asc");
      $this->view_data['taxx'] = $taxx;

      @$oii=mysql_fetch_array(mysql_query("select * from settings where id=1 "));

      $this->view_data['oii'] = $oii;
      $this->view_data['suppliers'] = Supplier::all();

       $sttyf=mysql_query("select * from state where CountryID=1 order by StateName asc ");
        $this->view_data['stty'] = $sttyf;




        date_default_timezone_set($this->setting->timezone);
        $this->view_data['customers'] = Customer::all();
       /* $this->view_data['products'] = $products;*/
        $this->view_data['categories'] = Category::all();
        $this->view_data['Stores'] = Store::all();
        if (! Posale::first()) {
            $hold = Hold::last();
            if ($hold)
                $hold->update_attributes(array(
                    'time' => date("H:i")
                ));
        }
        $this->content_view = 'pos';
    }

    public function change($type)
    {
        $this->session->set_userdata('lang', $type);
        $this->setting->language = $type;
        $this->setting->save();
        redirect("");
    }    

    public function posview()
    {
      $this->load->database();
      $this->content_view = 'dashpos';
    }
}
