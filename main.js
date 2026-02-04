// ========== POSTS FUNCTIONS ==========
async function LoadData() {
    let res = await fetch("http://localhost:3000/posts")
    let posts = await res.json();
    let body = document.getElementById("body_table");
    body.innerHTML = '';
    for (const post of posts) {
        let styleClass = post.isDeleted ? 'class="deleted"' : '';
        body.innerHTML += `<tr ${styleClass}>
            <td>${post.id}</td>
            <td>${post.title}</td>
            <td>${post.views}</td>
           <td>
               <input type="submit" value="Edit" onclick="EditPost(${post.id})"/>
               <input type="submit" value="Delete" onclick="DeletePost(${post.id})"/>
               <input type="submit" value="Comments" onclick="ShowComments(${post.id})"/>
           </td>
        </tr>`
    }
}

async function GetMaxPostId() {
    let res = await fetch("http://localhost:3000/posts")
    let posts = await res.json();
    if (posts.length === 0) return 0;
    let maxId = Math.max(...posts.map(p => parseInt(p.id)));
    return maxId;
}

async function Save() {
    let id = document.getElementById("id_txt").value;
    let title = document.getElementById("title_txt").value;
    let views = document.getElementById("view_txt").value;
    
    if (!title.trim() || !views.trim()) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return false;
    }

    if (id) {
        // Update existing post
        let res = await fetch('http://localhost:3000/posts/'+id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                views: views
            })
        });
        if (res.ok) {
            console.log("Cập nhật thành công");
        }
    } else {
        // Create new post with auto-increment ID
        let maxId = await GetMaxPostId();
        let newId = (maxId + 1).toString();
        try {
            let res = await fetch('http://localhost:3000/posts', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: newId,
                    title: title,
                    views: views,
                    isDeleted: false
                })
            });
            if (res.ok) {
                console.log("Tạo mới thành công");
            }
        } catch (error) {
            console.log(error);
        }
    }
    
    document.getElementById("id_txt").value = "";
    document.getElementById("title_txt").value = "";
    document.getElementById("view_txt").value = "";
    LoadData();
    return false;
}

async function EditPost(id) {
    let res = await fetch('http://localhost:3000/posts/' + id);
    let post = await res.json();
    document.getElementById("id_txt").value = post.id;
    document.getElementById("title_txt").value = post.title;
    document.getElementById("view_txt").value = post.views;
}

async function DeletePost(id) {
    // Soft delete - mark as deleted instead of hard delete
    let res = await fetch("http://localhost:3000/posts/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            isDeleted: true
        })
    });
    if (res.ok) {
        console.log("Xóa thành công");
    }
    LoadData();
    return false;
}

// ========== COMMENTS FUNCTIONS ==========
let currentPostId = null;

async function ShowComments(postId) {
    currentPostId = postId;
    let res = await fetch("http://localhost:3000/comments?postId=" + postId);
    let comments = await res.json();
    
    let commentsDiv = document.getElementById("comments_section");
    commentsDiv.innerHTML = `<h3>Bình luận cho Post ${postId}</h3>`;
    
    for (const comment of comments) {
        let styleClass = comment.isDeleted ? 'style="text-decoration: line-through;"' : '';
        commentsDiv.innerHTML += `
            <div ${styleClass}>
                <p><strong>ID:</strong> ${comment.id} - ${comment.text}</p>
                <input type="submit" value="Edit" onclick="EditComment(${comment.id})"/>
                <input type="submit" value="Delete" onclick="DeleteComment(${comment.id})"/>
                <hr/>
            </div>
        `;
    }
    
    commentsDiv.innerHTML += `
        <div>
            <input type="text" id="comment_txt" placeholder="Nhập bình luận mới"/>
            <input type="submit" value="Thêm bình luận" onclick="AddComment()"/>
        </div>
    `;
}

async function AddComment() {
    let text = document.getElementById("comment_txt").value;
    if (!text.trim()) {
        alert("Vui lòng nhập bình luận");
        return;
    }
    
    let maxId = 0;
    let res = await fetch("http://localhost:3000/comments");
    let comments = await res.json();
    if (comments.length > 0) {
        maxId = Math.max(...comments.map(c => parseInt(c.id)));
    }
    let newId = (maxId + 1).toString();
    
    let createRes = await fetch('http://localhost:3000/comments', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: newId,
            text: text,
            postId: currentPostId.toString(),
            isDeleted: false
        })
    });
    
    if (createRes.ok) {
        console.log("Thêm bình luận thành công");
        document.getElementById("comment_txt").value = "";
        ShowComments(currentPostId);
    }
}

async function EditComment(id) {
    let res = await fetch('http://localhost:3000/comments/' + id);
    let comment = await res.json();
    document.getElementById("comment_txt").value = comment.text;
}

async function DeleteComment(id) {
    // Soft delete - mark as deleted
    let res = await fetch("http://localhost:3000/comments/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            isDeleted: true
        })
    });
    if (res.ok) {
        console.log("Xóa bình luận thành công");
        ShowComments(currentPostId);
    }
}

LoadData();