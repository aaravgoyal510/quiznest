<div class="navbar">

    <div class="nav-left">
        <h2>Quiz Admin Panel</h2>
    </div>

    <div class="nav-center">
        <input type="text" placeholder="Search Students, Teachers, Subjects...">
    </div>

    <div class="nav-right">

        <span>
            <?php
                date_default_timezone_set("Asia/Kolkata");
                echo date("d M Y | h:i A");
            ?>
        </span>

        <div class="admin-name">
            Welcome, Admin
        </div>

    </div>

</div>