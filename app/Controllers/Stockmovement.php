<?php
defined('BASEPATH') or exit('No direct script access allowed');

class Stockmovement extends MY_Controller
{

    function __construct()
    {
        parent::__construct();
        if (! $this->user) {
            redirect('login');
        }
        if ($this->user->role !== "admin") {
            redirect('');
        }

        $lang = $this->session->userdata("lang") == null ? "english" : $this->session->userdata("lang");
        $this->lang->load($lang, $lang);
        $this->register = $this->session->userdata('register') ? $this->session->userdata('register') : FALSE;
        $this->store = $this->session->userdata('store') ? $this->session->userdata('store') : FALSE;

        $this->setting = Setting::find(1);
        date_default_timezone_set($this->setting->timezone);

        $this->load->database();

         
    }

    public function index()
    {
         $this->view_data['register'] = $this->register;
      $this->content_view = 'physicalstock';
      
        
    }

    public function deleteUser($id)
    {
        $user = User::find($id);
        unlink('./files/Avatars/' . $user->avatar);
        $user->delete();
        redirect("/settings?tab=users", "location");
    }

    public function findState()
    {
      $kmm= $_GET['country'];
      
    $mk=mysql_query("select * from products where brandd='".$kmm."' ");
    while($mkf=mysql_fetch_array($mk))
    {?>
<option value="<?php echo $mkf['id'];?>"><?php echo $mkf['name'];?></option>
<?php } 
exit;

    }      
       

        public function stockadd()
        { 


$register = Register::find($this->register);
         $user = User::find($register->user_id);



 $storeid = Register::find($this->register)->store_id;
 $createdBy = $user->firstname . ' ' . $user->lastname;


            $warr=$this->input->post('warr');
            $avvl=$this->input->post('avalqqt');
            $proiddd=$this->input->post('statediv');

            $mnnnn=$this->input->post('srrtr');
            $cct=count($mnnnn);
            $th=0;
            for($r=0;$r<$cct;$r++)
            {
                $th=$th+$mnnnn[$r];
            }
            if($avvl >= $th)
            {
                 $mm=0;
           $mmm=mysql_query("select * from stores order by name asc ");
           while($mmmf=mysql_fetch_array($mmm))
           {
            $kmmwe=$mnnnn[$mm];
            $kmddwe=date("Y-m-d");
            $strid=$mmmf['id'];
            if($kmmwe>0)
            {

                $kmmlp=mysql_query("select * from stocks where  product_id='".$proiddd."' and warehouse_id='".$warr."' and store_id='".$strid."' ");
                if(mysql_num_rows($kmmlp)==0)
                {
               mysql_query("insert into stock_transfer(war_id,store_id,pro_id,qty,tyoftrans,date,bywhom,perselphy_ids) 
    values('".$warr."','".$strid."','".$proiddd."','".$kmmwe."','1','".$kmddwe."','".$createdBy."','0')  ");

                mysql_query("insert into stocks set product_id='".$proiddd."' ,type='IN',store_id='".$strid."' ,warehouse_id='".$warr."' ,quantity='".$kmmwe."',datte='".$kmddwe."' " );
                }
                else
                {
                $kmmlpf=mysql_fetch_array($kmmlp);
                $kmcrym=$kmmlpf['quantity']+$kmmwe;
                
                mysql_query("insert into stock_transfer(war_id,store_id,pro_id,qty,tyoftrans,date,bywhom,perselphy_ids) 
    values('".$warr."','".$strid."','".$proiddd."','".$kmmwe."','1','".$kmddwe."','".$createdBy."','0')  ");

                mysql_query("update stocks set  type='0' , quantity='".$kmcrym."',datte='".$kmddwe."' where product_id='".$proiddd."' and warehouse_id='".$warr."' and  store_id='".$strid."' " );
                }


            
            }

             $mm++;
            }


            }

            redirect('purchase');

          }


        public function addrow()
        { 
         $data['count']=$this->input->post('countid');
         
         $this->load->view('problemaddrow',$data);
    }



    public function findcctn()
    {
      $kmm= $_GET['country'];


    $mk= mysql_fetch_array(mysql_query("select * from products where id='".$kmm."' "));

    $lxzmm=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        if($lxzmm['gst_tax']==1)
        {



    echo $mk['cost'].','.$mk['price'].','.$mk['tax'].','.$mk['sgst'];
}
else
{
  echo $mk['cost'].','.$mk['price'].',0,0';  
}

   
exit;

    }  

     public function findssss()
    {
      $kmm= $_GET['country'];
      $kmc= $_GET['sss'];
      if($kmm>0 && $kmc>0)
      {
            $pstkk=0;
            $pstk=mysql_query("select * from purchase_items where warehouse_id='".$kmc."'  and product_id='".$kmm."' ");
            while($pstkf=mysql_fetch_array($pstk))
            {
            $pstkk=$pstkk+$pstkf['qt'];
            }

            $stf=0;
            $stk=mysql_query("select * from stocks where warehouse_id='".$kmc."'  and product_id='".$kmm."' ");
            while($stkf=mysql_fetch_array($stk))
            {
            $stf=$stf+$stkf['quantity'];
            }
            $vaav=$pstkk-$stf;



    echo $vaav;
}
else
{
    echo 0;
}

   
exit;

    } 



    public function add()
    {
        $this->content_view = 'addphysicalstock';
    }


   public function addtodbb()
    {


 $register = Register::find($this->register);
         $user = User::find($register->user_id);



 $storeid = Register::find($this->register)->store_id;
 $createdBy = $user->firstname . ' ' . $user->lastname;
   $this->load->database();
$lal1=$this->input->post('betot');




$la31=$this->input->post('innvno');
$la322=$this->input->post('pddate');
$la33=$this->input->post('pptye');
$la34=$this->input->post('innvdda');
$la35=$this->input->post('innvamt');



$lal2=$this->input->post('cskgst');
$lal3=$this->input->post('sskgst');
$la38=$this->input->post('ddkst');
$lal4=$this->input->post('afftot');



$la322x = explode('/', $la322);
$la32 = $la322x[2].'-'.$la322x[0].'-'.$la322x[1];


$la37=0;


$warehoseid=$this->input->post('warr');
if($lal1>0 && $lal4>0 && $lal1==$la35 && $warehoseid>0)
{
    
  
    $datt=date("Y-m-d");
    $attach=1;
    $supllir=$this->input->post('supp');
    $mkl=$this->session->userdata('register') ? $this->session->userdata('register') : FALSE;
    $oi=mysql_fetch_array(mysql_query("select * from registers where id='".$mkl."' "));
    

    $createdby=$oi['user_id'];
    $strid=$this->session->userdata('store') ? $this->session->userdata('store') : FALSE;

    $ref=$strid.'C'.time();

    
    $nott=$this->input->post('nott');
  

   
   mysql_query("insert into purchases(discper,discamt,invno,purdat,purtpy,invdat,invamt,betot, cgst,sgst, ref,date,total,attachement,supplier_id,status,created_by,type,store_id,warehouse_id,note,modified_at)     
    values('".$la37."','".$la38."','".$la31."','".$la32."','".$la33."','".$la34."','".$la35."','".$lal1."','".$lal2."','".$lal3."','".$ref."','".$datt."','".$lal4."','".$attach."','".$supllir."','1','".$createdby."','0','".$strid."','".$warehoseid."','".$nott."','') ");
}


$oll=mysql_insert_id();
$lal5=$this->input->post('statediv');
$lal6=$this->input->post('statediv');
$lal7=$this->input->post('subtt');
$lxxxx=$this->input->post('customerSelect');
$lal8=$this->input->post('qty');
$lal9=$this->input->post('cosst');
$lal10=0;
$lal11=0;
$lal12=0;
$lal13=0;

$mm=count($lal5);
for($ii=0;$ii<$mm;$ii++)
{
if($oll>0  && $lal6[$ii]>0 && $lal8[$ii] &&  $lal9[$ii]  )
{
 
 mysql_query("insert into  purchase_items(supplier,  brandidd,warehouse_id,purchase_id,product_id,qt,cost,subtot,cgst,sgst,ttcg,ttsg,ndate) 
values('".$supllir."','".$lxxxx[$ii]."','".$warehoseid."','".$oll."','".$lal6[$ii]."','".$lal8[$ii]."','".$lal9[$ii]."','".$lal7[$ii]."','".$lal10[$ii]."','".$lal11[$ii]."','".$lal12[$ii]."','".$lal13[$ii]."','".$la32."') ");
 $szpp=mysql_insert_id();





}
}

redirect('purchase');



    }

    public function edit($id = FALSE)
    { 
        
        $this->content_view = 'editpurchase';



    }




    public function edittodbb($id = FALSE)
    {  


$newprr=$this->input->post('proid');
     $oww=mysql_query("select * from purchase_items where purchase_id='". $id."' ");
     while($owwf=mysql_fetch_array($oww))
     {
      $tppr=$owwf['id'];
      mysql_query("delete from stocks where puritem_id='".$tppr."' ");
      mysql_query("delete from purchase_items where id='".$tppr."' ");

     }



 $register = Register::find($this->register);
         $user = User::find($register->user_id);



 $storeid = Register::find($this->register)->store_id;
 $createdBy = $user->firstname . ' ' . $user->lastname;
   $this->load->database();
$lal1=$this->input->post('betot');
$lal2=$this->input->post('ttrcgst');
$lal3=$this->input->post('ttrsgst');
$lal4=$this->input->post('aftot');


$la31=$this->input->post('innvno');
$la322=$this->input->post('pddate');

$la322x = explode('/', $la322);
$la32 = $la322x[2].'-'.$la322x[0].'-'.$la322x[1];


$la33=$this->input->post('pptye');
$la34=$this->input->post('innvdda');
$la35=$this->input->post('innvamt');


$la37=$this->input->post('distx');
$la38=$this->input->post('discct');
if($lal1>0 && $lal4>0 && $lal4==$la35)
{
    
    $datt=date("Y-m-d");
    $attach=1;
    $supllir=$this->input->post('supp');
    $mkl=$this->session->userdata('register') ? $this->session->userdata('register') : FALSE;
    $oi=mysql_fetch_array(mysql_query("select * from registers where id='".$mkl."' "));
    

    $createdby=$oi['user_id'];
    $strid=$this->session->userdata('store') ? $this->session->userdata('store') : FALSE;

    $ref=$strid.'C'.time();

    $warehoseid=$this->input->post('warr');
    $nott=$this->input->post('nott');
  
   mysql_query("update   purchases set 
    discper='".$la37."',
    discamt='".$la38."',
    invno='".$la31."',
    purdat='".$la32."',
    purtpy='".$la33."',
    invdat='".$la34."',
    invamt='".$la35."',
    betot= '".$lal1."',
    cgst='".$lal2."',
    sgst= '".$lal3."',
    ref='".$ref."',
    date='".$datt."',
    total='".$lal4."',
    attachement='".$attach."',
    supplier_id='".$supllir."',
    status=1,
    created_by='".$createdby."',
    type=0,
    store_id='".$strid."',
    warehouse_id='".$warehoseid."',
    note='".$nott."',
    modified_at='".$datt."' where id='".$id."' ");
}
if($lal4==0 && $la35==0 )
{
mysql_query("delete from purchases  where id='".$id."'  ");
}


$oll=$id;
$lal5=$this->input->post('country');
$lal6=$this->input->post('proid');
$lal7=$this->input->post('subtt');
$lal8=$this->input->post('qty');
$lal9=$this->input->post('cosst');
$lal10=$this->input->post('cgst');
$lal11=$this->input->post('sgst');
$lal12=$this->input->post('ttcgst');
$lal13=$this->input->post('ttsgst');

$mm=count($lal5);
for($ii=0;$ii<$mm;$ii++)
{
if($oll>0  && $lal6[$ii]>0 && $lal8[$ii] &&  $lal9[$ii]  )
{
 
 mysql_query("insert into  purchase_items(supplier,purchase_id,product_id,qt,cost,subtot,cgst,sgst,ttcg,ttsg,ndate) 
values('".$supllir."','".$oll."','".$lal6[$ii]."','".$lal8[$ii]."','".$lal9[$ii]."','".$lal7[$ii]."','".$lal10[$ii]."','".$lal11[$ii]."','".$lal12[$ii]."','".$lal13[$ii]."','".$la32."') ");
 $szpp=mysql_insert_id();


mysql_query("insert into stocks(product_id,type,store_id,warehouse_id,quantity,price,puritem_id,datte)
        values('".$lal6[$ii]."','','".$storeid."','".$warehoseid."','".$lal8[$ii]."','".$lal9[$ii]."','".$szpp."','".$la32."') ");


}
}
redirect('purchase');
 








    
}



}
