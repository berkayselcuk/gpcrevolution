// bigSearch.js

// Create the big search bar element dynamically inside the container with id "big-search-container"
function createBigSearchBar() {
    const container = document.getElementById('big-search-container');
    if (!container) {
        console.error('No element with id "big-search-container" found.');
        return;
    }
    
    // Create and append the heading
    const heading = document.createElement('h1');
    heading.textContent = 'Find your receptor';
    heading.className = 'big-search-heading';
    
    // Create search bar wrapper
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'big-search-bar';
    
    // Create the input field for search
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'big-search-box';
    searchInput.placeholder = 'Enter receptor name e.g. ADRB2';
    
    // Create the search button
    const searchButton = document.createElement('button');
    searchButton.id = 'big-search-button';
    searchButton.textContent = 'Search';
    
    // Append input and button into the wrapper
    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(searchButton);
    
    // Append heading and search bar wrapper to the container
    container.appendChild(heading);
    container.appendChild(searchWrapper);
    
    // Attach event listener to the button
    searchButton.addEventListener('click', bigSearchReceptor);
}

// Fetch receptor names from receptors.json and initialize autocomplete on the big search bar
async function loadBigReceptorNames() {
    try {
        const response = await fetch('receptors.json');
        const receptors = await response.json();
        const receptorNames = receptors.map(receptor => receptor.geneName);
        bigAutocomplete(document.getElementById("big-search-box"), receptorNames);
    } catch (error) {
        console.error('Error loading receptor names for big search:', error);
    }
}

// Autocomplete functionality for the big search bar with independent variable names
function bigAutocomplete(input, arr) {
    let currentFocus;
    
    input.addEventListener("input", function(e) {
        let a, b, i, val = this.value;
        closeAllListsBig();
        if (!val) return false;
        currentFocus = -1;
        a = document.createElement("div");
        a.setAttribute("id", this.id + "big-autocomplete-list");
        a.setAttribute("class", "big-autocomplete-items");
        this.parentNode.appendChild(a);
        for (i = 0; i < arr.length; i++) {
            if (arr[i].substr(0, val.length).toUpperCase() === val.toUpperCase()) {
                b = document.createElement("div");
                b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>" + arr[i].substr(val.length);
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                b.addEventListener("click", function(e) {
                    input.value = this.getElementsByTagName("input")[0].value;
                    closeAllListsBig();
                    bigSearchReceptor();
                });
                a.appendChild(b);
            }
        }
    });

    input.addEventListener("keydown", function(e) {
        let x = document.getElementById(this.id + "big-autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode === 40) {
            currentFocus++;
            addActiveBig(x);
        } else if (e.keyCode === 38) {
            currentFocus--;
            addActiveBig(x);
        } else if (e.keyCode === 13) {
            e.preventDefault();
            if (currentFocus > -1 && x) {
                x[currentFocus].click();
            }
        }
    });

    function addActiveBig(x) {
        if (!x) return false;
        removeActiveBig(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = x.length - 1;
        x[currentFocus].classList.add("big-autocomplete-active");
    }

    function removeActiveBig(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("big-autocomplete-active");
        }
    }

    function closeAllListsBig(elmnt) {
        let x = document.getElementsByClassName("big-autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt !== x[i] && elmnt !== input) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener("click", function (e) {
        closeAllListsBig(e.target);
    });
}

// A helper function to close all autocomplete lists for big search
function closeAllListsBig(elmnt) {
    let x = document.getElementsByClassName("big-autocomplete-items");
    for (let i = 0; i < x.length; i++) {
        if (elmnt !== x[i]) {
            x[i].parentNode.removeChild(x[i]);
        }
    }
}

// Trigger the search when the user clicks the search button or selects an autocomplete suggestion
function bigSearchReceptor() {
    const searchQuery = document.getElementById("big-search-box").value.trim();
    if (!searchQuery) {
        alert("Please enter a receptor name.");
        return;
    }
    window.location.href = `receptor.html?gene=${encodeURIComponent(searchQuery)}`;
}

// Initialize the big search bar and its functionalities when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    createBigSearchBar();
    loadBigReceptorNames();
});
