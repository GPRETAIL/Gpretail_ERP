<?php

namespace App\Libraries;

require_once dirname(__FILE__) . '/tcpdf/tcpdf.php';

use TCPDF;

class Pdf extends TCPDF
{
    function __construct()
    {
        parent::__construct();
    }
}
/*Author:Tutsway.com */
/* End of file Pdf.php */
/* Location: ./application/libraries/Pdf.php */
