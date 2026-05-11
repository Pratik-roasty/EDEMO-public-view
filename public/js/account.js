function switchTab(element, viewId) {
            // Update tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            element.classList.add('active');

            // Update views
            document.getElementById('created').style.display = (viewId === 'created') ? 'grid' : 'none';
            document.getElementById('voted').style.display = (viewId === 'voted') ? 'grid' : 'none';
        }