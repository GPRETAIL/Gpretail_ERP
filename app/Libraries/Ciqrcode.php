<?php

namespace App\Libraries;

class Ciqrcode
{
    protected $cacheable = true;
    protected $cachedir;
    protected $errorlog;
    protected $quality = true;
    protected $size = 1024;

    public function __construct($config = [])
    {
        // Include PHPQRCode library
        require_once APPPATH . 'ThirdParty/phpqrcode/qrconst.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrtools.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrspec.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrimage.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrinput.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrbitstream.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrsplit.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrrscode.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrmask.php';
        require_once APPPATH . 'ThirdParty/phpqrcode/qrencode.php';

        $this->initialize($config);
    }

    public function initialize(array $config = [])
    {
        $this->cachedir = $config['cachedir'] ?? WRITEPATH . 'cache/';
        $this->errorlog = $config['errorlog'] ?? WRITEPATH . 'logs/';
        $this->quality = $config['quality'] ?? true;
        $this->cacheable = $config['cacheable'] ?? true;
        $this->size = $config['size'] ?? 1024;

        defined('QR_CACHEABLE') || define('QR_CACHEABLE', $this->cacheable);
        defined('QR_CACHE_DIR') || define('QR_CACHE_DIR', $this->cachedir);
        defined('QR_LOG_DIR') || define('QR_LOG_DIR', $this->errorlog);
        defined('QR_FIND_BEST_MASK') || define('QR_FIND_BEST_MASK', $this->quality);
        defined('QR_FIND_FROM_RANDOM') || define('QR_FIND_FROM_RANDOM', false);
        defined('QR_PNG_MAXIMUM_SIZE') || define('QR_PNG_MAXIMUM_SIZE', $this->size);
    }

    public function generate(array $params = [])
    {
        if (isset($params['black']) && is_array($params['black']) && count($params['black']) == 3) {
            \QRimage::$black = $params['black'];
        }

        if (isset($params['white']) && is_array($params['white']) && count($params['white']) == 3) {
            \QRimage::$white = $params['white'];
        }

        $data = $params['data'] ?? 'QR Code Library';
        $level = in_array(($params['level'] ?? 'L'), ['L', 'M', 'Q', 'H']) ? $params['level'] : 'L';
        $size = min(max((int)($params['size'] ?? 4), 1), 10);

        if (isset($params['savename'])) {
            \QRcode::png($data, $params['savename'], $level, $size, 2);
            return $params['savename'];
        } else {
            \QRcode::png($data, null, $level, $size, 2);
        }
    }
}
