<?php

namespace App\Libraries;

// TCPDF now comes from the tecnickcom/tcpdf Composer package (autoloaded)
// instead of the vendored app/Libraries/tcpdf/ copy this used to require
// directly - that copy was frozen at whatever version it was dropped in
// and never received a patch.
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
