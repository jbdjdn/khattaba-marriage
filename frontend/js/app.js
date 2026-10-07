document.addEventListener("DOMContentLoaded", () => {
    const createAccountButton = document.querySelector(".btn-primary");

    createAccountButton.addEventListener("click", () => {
        window.location.href = "register.html";
    });
});
