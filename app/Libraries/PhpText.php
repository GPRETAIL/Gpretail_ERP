<?php

namespace App\Libraries;

class PhpText
{
    public function phptext($text, $textColor, $backgroundColor = '', $fontSize, $imgWidth, $imgHeight, $dir, $fileName)
    {
        $font = WRITEPATH . 'fonts/calibri.ttf'; // Update with real font path
        $textRGB = $this->hexToRGB($textColor);

        $im = imagecreatetruecolor($imgWidth, $imgHeight);
        $textColorRes = imagecolorallocate($im, $textRGB['r'], $textRGB['g'], $textRGB['b']);

        if (empty($backgroundColor)) {
            $colors = ['#56aad8', '#61c4a8', '#d3ab92'];
            $bgRGB = $this->hexToRGB($colors[array_rand($colors)]);
        } else {
            $bgRGB = $this->hexToRGB($backgroundColor);
        }

        $bgColorRes = imagecolorallocate($im, $bgRGB['r'], $bgRGB['g'], $bgRGB['b']);
        imagefill($im, 0, 0, $bgColorRes);

        [$x, $y] = $this->ImageTTFCenter($im, $text, $font, $fontSize);
        imagettftext($im, $fontSize, 0, $x, $y, $textColorRes, $font, $text);

        if (imagejpeg($im, $dir . $fileName, 90)) {
            imagedestroy($im);
            return json_encode(['status' => true, 'image' => $dir . $fileName]);
        }

        imagedestroy($im);
        return json_encode(['status' => false]);
    }

    public function phpcaptcha($textColor, $backgroundColor, $imgWidth, $imgHeight, $noiceLines = 0, $noiceDots = 0, $noiceColor = '#162453')
    {
        helper('session');
        $text = $this->random();
        $font = WRITEPATH . 'fonts/monofont.ttf'; // Update this path
        $fontSize = $imgHeight * 0.75;

        $im = imagecreatetruecolor($imgWidth, $imgHeight);
        $textRGB = $this->hexToRGB($textColor);
        $textColorRes = imagecolorallocate($im, $textRGB['r'], $textRGB['g'], $textRGB['b']);

        $bgRGB = $this->hexToRGB($backgroundColor);
        $bgColorRes = imagecolorallocate($im, $bgRGB['r'], $bgRGB['g'], $bgRGB['b']);

        imagefill($im, 0, 0, $bgColorRes);

        if ($noiceLines > 0) {
            $noiseRGB = $this->hexToRGB($noiceColor);
            $noiseColorRes = imagecolorallocate($im, $noiseRGB['r'], $noiseRGB['g'], $noiseRGB['b']);
            for ($i = 0; $i < $noiceLines; $i++) {
                imageline($im, rand(0, $imgWidth), rand(0, $imgHeight), rand(0, $imgWidth), rand(0, $imgHeight), $noiseColorRes);
            }
        }

        if ($noiceDots > 0) {
            for ($i = 0; $i < $noiceDots; $i++) {
                imagefilledellipse($im, rand(0, $imgWidth), rand(0, $imgHeight), 3, 3, $textColorRes);
            }
        }

        [$x, $y] = $this->ImageTTFCenter($im, $text, $font, $fontSize);
        imagettftext($im, $fontSize, 0, $x, $y, $textColorRes, $font, $text);

        // Set header and output the image
        header('Content-Type: image/jpeg');
        imagejpeg($im);
        imagedestroy($im);

        session()->set('captcha_code', $text);
    }

    protected function random($length = 6, $chars = '23456789bcdfghjkmnpqrstvwxyz')
    {
        $str = '';
        for ($i = 0; $i < $length; $i++) {
            $str .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $str;
    }

    protected function hexToRGB($hex)
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        return [
            'r' => hexdec(substr($hex, 0, 2)),
            'g' => hexdec(substr($hex, 2, 2)),
            'b' => hexdec(substr($hex, 4, 2))
        ];
    }

    protected function ImageTTFCenter($image, $text, $font, $size, $angle = 0)
    {
        $xi = imagesx($image);
        $yi = imagesy($image);
        $box = imagettfbbox($size, $angle, $font, $text);
        $xr = abs(max($box[2], $box[4]));
        $yr = abs(max($box[5], $box[7]));
        $x = intval(($xi - $xr) / 2);
        $y = intval(($yi + $yr) / 2);
        return [$x, $y];
    }
}
