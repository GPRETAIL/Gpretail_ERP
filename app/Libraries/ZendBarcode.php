<?php

namespace App\Libraries;

use Laminas\Barcode\Barcode;

class ZendBarcode
{
    public function render($text = '123456789', $type = 'code128')
    {
        $barcode = Barcode::factory(
            $type,
            'image',
            ['text' => $text],
            ['imageType' => 'png']
        );

        $barcode->render();
    }

    public function saveToFile($text = '123456789', $type = 'code128', $filePath = WRITEPATH . 'barcodes/output.png')
    {
        $barcode = Barcode::factory(
            $type,
            'image',
            ['text' => $text],
            ['imageType' => 'png']
        );

        $image = $barcode->draw();
        imagepng($image, $filePath);

        return $filePath;
    }
}
