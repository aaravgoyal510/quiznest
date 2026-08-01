<?php
include("../database/db.php");

if(isset($_POST['save']))
{

$name=$_POST['name'];
$email=$_POST['email'];
$department=$_POST['department'];
$year=$_POST['year'];

mysqli_query($conn,"INSERT INTO students(name,email,department,year)

VALUES('$name','$email','$department','$year')");

header("Location:student.php");

}
?>

<!DOCTYPE html>

<html>

<head>

<link rel="stylesheet" href="../css/style.css">

</head>

<body>

<?php include("sidebar.php"); ?>
<?php include("navbar.php"); ?>

<div class="main">

<h1 class="page-title">➕ Add New Student</h1>

<div class="form-container">

<form method="POST">

<label>Student Name</label>

<input
type="text"
name="name"
placeholder="Enter Student Name"
required>

<label>Email Address</label>

<input
type="email"
name="email"
placeholder="Enter Email Address"
required>

<label>Department</label>

<select name="department">

<option value="">Select Department</option>

<option>CSE</option>

<option>IT</option>

<option>ECE</option>

<option>EEE</option>

<option>Mechanical</option>

<option>Civil</option>

</select>

<label>Year</label>

<select name="year">

<option value="">Select Year</option>

<option>1st Year</option>

<option>2nd Year</option>

<option>3rd Year</option>

<option>4th Year</option>

</select>

<br><br>

<input
type="submit"
name="save"
value="Save Student"
class="btn">

<a href="student.php" class="btn" style="margin-left:10px;background:#777;">

Cancel

</a>

</form>

</div>
</div>
</body>
</html>