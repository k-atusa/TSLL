// link view & event handlers
const views = {
    list: document.getElementById('viewList'),
    newPost: document.getElementById('viewNewPost'),
    postDetail: document.getElementById('viewPostDetail')
};
function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

// event listeners
document.getElementById('homeLink').addEventListener('click', (e) => {
    e.preventDefault();
    loadPosts();
    showView('list');
});
document.getElementById('newPostBtn').addEventListener('click', () => {
    showView('newPost');
});
document.getElementById('cancelPostBtn').addEventListener('click', () => {
    document.getElementById('postForm').reset();
    showView('list');
});
document.getElementById('backBtn').addEventListener('click', () => {
    loadPosts();
    showView('list');
});

// load posts
async function loadPosts() {
    try {
        const res = await fetch('/api/com/posts');
        const posts = await res.json();
        const container = document.getElementById('postsContainer');
        container.innerHTML = '';

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p>No posts yet.</p>';
            return;
        }

        // make post card
        posts.forEach(post => {
            const el = document.createElement('div');
            el.className = 'post-card';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            const dateStr = new Date(post.createdAt / 1000000).toLocaleString();
            el.innerHTML = `<h3 style="margin: 0;">${escapeHtml(post.title)}</h3><small style="color: gray;">${dateStr}</small>`;
            el.addEventListener('click', () => loadPostDetail(post.id));
            container.appendChild(el);
        });
    } catch (e) {
        console.error('Failed to load posts', e);
    }
}

// load post detail
async function loadPostDetail(id) {
    try {
        const res = await fetch(`/api/com/posts/${id}`);
        const post = await res.json();
        const container = document.getElementById('detailContainer');

        // make post detail
        let html = `<h2>${escapeHtml(post.title)}</h2>`;
        if (post.body) {
            html += `<p style="white-space: pre-wrap;">${escapeHtml(post.body)}</p>`;
        }
        let mediaHtml = '';
        let downloadHtml = '';

        // make post media & download link
        if (post.files && post.files.length > 0) {
            mediaHtml += `<div class="media-container">`;
            downloadHtml += `<div class="download-section"><h3>Downloads</h3>`;

            post.files.forEach(file => {
                const fileUrl = `/api/com/files/${encodeURIComponent(file)}`;
                const lower = file.toLowerCase();

                // Display media
                if (lower.match(/\.(jpeg|jpg|gif|png|webp)$/)) {
                    mediaHtml += `<img src="${fileUrl}" class="media-item" alt="Attachment">`;
                } else if (lower.match(/\.(mp4|webm|ogg)$/)) {
                    mediaHtml += `<video controls src="${fileUrl}" class="media-item"></video>`;
                }

                // Add individual download button
                downloadHtml += `<a href="${fileUrl}" download="${escapeHtml(file)}" class="download-btn">⬇️ ${escapeHtml(file)}</a>`;
            });

            mediaHtml += `</div>`;
            downloadHtml += `</div>`;
        }

        container.innerHTML = html + mediaHtml + downloadHtml;
        showView('postDetail');
    } catch (e) {
        console.error('Failed to load post detail', e);
    }
}

// post submit
document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const res = await fetch('/api/com/posts', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            e.target.reset();
            loadPosts();
            showView('list');
        } else {
            alert('Failed to submit post.');
        }
    } catch (err) {
        console.error('Error submitting post', err);
        alert('Error submitting post.');
    }
});

// trim file name
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initial load
loadPosts();
showView('list');
