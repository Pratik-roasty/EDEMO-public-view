function showView(viewId) {
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            
            document.getElementById(viewId).classList.add('active');
            
            document.querySelectorAll('.nav-item').forEach(n => {
                if(n.innerText.toLowerCase().includes(viewId.replace('-', ' '))) n.classList.add('active');
            });
        }

        function searchPolls(query) {
            const polls = document.querySelectorAll('.poll-item');
            polls.forEach(poll => {
                const text = poll.innerText.toLowerCase();
                poll.style.display = text.includes(query.toLowerCase()) ? 'flex' : 'none';
            });
        }