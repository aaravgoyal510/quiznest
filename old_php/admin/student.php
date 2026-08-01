<?php
include("../database/db.php");
?>

<!DOCTYPE html>
<html>
<head>
    <title>Students</title>
    <link rel="stylesheet" href="../css/style.css">
</head>

<body>

<?php include("sidebar.php"); ?>
<?php include("navbar.php"); ?>

<div class="main">

<div class="page-header">

    <h1 class="page-title">🎓 Student Management</h1>

    <a href="add_student.php" class="btn">
        + Add Student
    </a>

</div>

<div class="search-bar">

    <input
        type="text"
        id="searchStudent"
        placeholder="🔍 Search Student..."
    >

</div>
<?php

$count = mysqli_query($conn,"SELECT COUNT(*) AS total FROM students");

$total = mysqli_fetch_assoc($count);

?>

<div class="card">

<h3>Total Students : <?php echo $total['total']; ?></h3>

</div>
<table>

<tr>

<th>ID</th>

<th>Name</th>

<th>Email</th>

<th>Department</th>

<th>Year</th>

<th>Status</th>

<th>Action</th>

</tr>

<?php

$result=mysqli_query($conn,"SELECT * FROM students");

if(mysqli_num_rows($result)>0)
{

while($row=mysqli_fetch_assoc($result))
{

{

?>

<tr>

<td><?php echo $row['id']; ?></td>

<td><?php echo $row['name']; ?></td>

<td><?php echo $row['email']; ?></td>

<td><?php echo $row['department']; ?></td>

<td><?php echo $row['year']; ?></td>

<td>

<span class="status-active">Active</span>

</td>

<td>

<a href="view_student.php?id=<?php echo $row['id']; ?>" class="view-btn">

View

</a>

<a href="edit_student.php?id=<?php echo $row['id']; ?>" class="edit-btn">

Edit

</a>

<a href="delete_student.php?id=<?php echo $row['id']; ?>" class="delete-btn"

onclick="return confirm('Are you sure you want to delete this student?');">

Delete

</a>

</td>

</tr>

<?php
}
?>

<?php

}

}
else
{

?>

<tr>

<td colspan="7" style="text-align:center;padding:30px;">

No students found.

</td>

</tr>

<?php

}

?>
</table>

</div>

</body>
</html>