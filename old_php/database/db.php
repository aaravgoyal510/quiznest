<?php
$conn = mysqli_connect("localhost","root","","quiz_db");

if(!$conn){
    die("Connection Failed : ".mysqli_connect_error());
}
?>