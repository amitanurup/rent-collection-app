
      if (localStorage.getItem("app_authenticated") === "true") {
        document.getElementById("loginOverlay").style.display = "none";
      }

      async function handleLogin(event) {
        if (event) event.preventDefault();
        
        const user = document.getElementById("loginMobile").value.trim().toLowerCase();
        const pass = document.getElementById("loginPassword").value.trim();
        const loginBtn = document.querySelector(".login-button");
        const errorMsg = document.getElementById("loginError");
        
        if (user === "amit") {
          try {
            loginBtn.textContent = "Checking...";
            loginBtn.disabled = true;
            
            let actualPass = "12345"; // default fallback
            
            try {
              // Fetch from Netlify blob instead of Firestore
              const response = await fetch(`/.netlify/functions/blob-get?key=${window.CLOUD_DOC_ID}_profile`);
              if (response.ok) {
                 const cloudData = await response.json();
                 if (cloudData && cloudData.value && cloudData.value.appPassword) {
                    actualPass = cloudData.value.appPassword;
                 }
              }
            } catch (e) {
               console.error("Blob fetch error:", e);
            }
            
            if (pass === actualPass) {
              localStorage.setItem("app_authenticated", "true");
              document.getElementById("loginOverlay").style.display = "none";
            } else {
              errorMsg.style.display = "block";
              errorMsg.textContent = "Invalid password!";
            }
          } catch(e) {
              console.error(e);
              if (pass === "12345") {
                localStorage.setItem("app_authenticated", "true");
                document.getElementById("loginOverlay").style.display = "none";
              } else {
                errorMsg.style.display = "block";
                errorMsg.textContent = "Network error. Default password is 12345.";
              }
          } finally {
            loginBtn.textContent = "Login";
            loginBtn.disabled = false;
          }
        } else {
          errorMsg.style.display = "block";
          errorMsg.textContent = "Invalid username!";
        }
      }

      function handleLogout() {
        localStorage.removeItem("app_authenticated");
        location.reload();
      }
    