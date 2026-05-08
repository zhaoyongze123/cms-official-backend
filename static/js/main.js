/**
 * WagtailCMS — Main JavaScript
 * Mobile navigation toggle
 */
document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('nav-toggle');
    const navList = document.getElementById('nav-list');

    if (toggle && navList) {
        toggle.addEventListener('click', function () {
            navList.classList.toggle('open');
        });

        // Close nav when clicking outside
        document.addEventListener('click', function (e) {
            if (!toggle.contains(e.target) && !navList.contains(e.target)) {
                navList.classList.remove('open');
            }
        });
    }
});
