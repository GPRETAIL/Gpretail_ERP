<?php

namespace App\Exceptions;

use Exception;

/** A return asks for more of an item than is still returnable from its bill. */
class PosReturnNotReturnableException extends Exception {}
