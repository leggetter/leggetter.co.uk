// Family Chart Initialization and Search
// Data and version will be injected by Python generator

console.log('Family Chart loading... Version: {{VERSION}}');
const data = {{DATA}};
console.log('Loaded', data.length, 'people');

// Store the initial person ID (first person in array - earliest by birth date)
const initialPersonId = data.length > 0 ? data[0].id : null;
console.log('Initial person ID:', initialPersonId);

// Initialize family-chart using f3 API with read-only mode
const f3Chart = f3.createChart('#FamilyChart', data, {
    card_edit: false,
    mini_tree: false,
    link_break: false,
    card_dim: {
        w: 250,  // Increased card width from default (~140px)
        h: 70,
        text_x: 75,
        text_y: 15,
        img_w: 60,
        img_h: 60,
        img_x: 5,
        img_y: 5
    },
    // initial_zoom: 0.5  // Start zoomed out to show more of the tree
});

f3Chart.setAncestryDepth(10);
f3Chart.setProgenyDepth(10);
f3Chart.setCardXSpacing(300);
f3Chart.setCardYSpacing(200);

// Configure card display (no depth limits - show full tree)
f3Chart.setCardHtml()
    .setCardDisplay([["first name", "last name"], ["birthday"], ["death"]]);

// Shared function to set the view to a specific person
function setViewToPerson(personId) {
    f3Chart.updateMainId(personId);
    f3Chart.updateTree({initial: false, tree_position: 'main_to_middle'});
}

// Initialize tree to fit all people (zoomed out view)
f3Chart.updateTree({initial: true, tree_position: 'fit'});

// Hide add buttons after rendering
setTimeout(() => {
    document.querySelectorAll('button, .f3-add-relative').forEach(el => {
        if (el.textContent && el.textContent.toLowerCase().includes('add')) {
            el.style.display = 'none';
        }
    });
}, 500);

// Search functionality with event delegation
const searchBox = document.getElementById('searchBox');
const searchResults = document.getElementById('searchResults');

searchBox.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    
    const matches = data.filter(person => {
        const fullName = `${person.data['first name']} ${person.data['last name']}`.toLowerCase();
        return fullName.includes(searchTerm);
    });
    
    if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    searchResults.innerHTML = matches.slice(0, 10).map(person => {
        const fullName = `${person.data['first name']} ${person.data['last name']}`;
        return `<div class="search-result-item" data-id="${person.id}">${fullName}</div>`;
    }).join('');
    
    searchResults.style.display = 'block';
});

// Use event delegation on parent container
console.log('Registering click handler on searchResults element:', searchResults);
searchResults.addEventListener('click', (e) => {
    console.log('Search results clicked, event:', e);
    const item = e.target.closest('.search-result-item');
    if (!item) {
        console.log('Not a search result item');
        return;
    }
    
    const personId = item.getAttribute('data-id');
    console.log('Clicked person ID:', personId);
    
    if (personId) {
        searchResults.style.display = 'none';
        searchBox.value = '';
        
        // Helper function to find path to person through parents
        function findPathToRoot(targetId, dataSet) {
            const path = [];
            let current = dataSet.find(p => p.id === targetId);
            
            while (current) {
                path.unshift(current.id);
                // Find parent (try father first, then mother)
                const parentIds = current.rels?.parents || [];
                if (parentIds.length > 0) {
                    current = dataSet.find(p => p.id === parentIds[0]);
                } else {
                    break;
                }
            }
            return path;
        }
        
        // Helper function to expand path to person
        function expandPathToPerson(targetId) {
            console.log('Looking for person:', targetId);
            const tree = f3Chart.store.getTree();
            let datum = tree.data.find(d => d.data.id === targetId);
            
            if (datum) {
                console.log('Person already visible in tree');
                return Promise.resolve(datum);
            }
            
            // Person not visible, need to expand ancestors
            console.log('Person not visible, finding path...');
            const path = findPathToRoot(targetId, data);
            console.log('Path to person:', path);
            
            if (path.length === 0) {
                console.log('Could not find path to person');
                return Promise.reject('Path not found');
            }
            
            // Navigate to root first, then expand downward
            const rootId = path[0];
            console.log('Navigating to root ancestor:', rootId);
            
            const rootDatum = tree.data.find(d => d.data.id === rootId);
            if (rootDatum) {
                // Navigate to the root first
                f3.handlers.cardToMiddle({
                    datum: rootDatum,
                    svg: f3Chart.svg,
                    svg_dim: f3Chart.svg.getBoundingClientRect(),
                    transition_time: 500
                });
            }
            
            // Expand each level in sequence from root down
            return new Promise((resolve) => {
                setTimeout(() => {
                    let currentIndex = 0;
                    
                    function expandNext() {
                        if (currentIndex >= path.length - 1) {
                            // Done expanding, find the target
                            setTimeout(() => {
                                const tree = f3Chart.store.getTree();
                                const finalDatum = tree.data.find(d => d.data.id === targetId);
                                if (finalDatum) {
                                    console.log('Successfully found target after expansion');
                                } else {
                                    console.log('Target still not found after all expansions');
                                }
                                resolve(finalDatum);
                            }, 500);
                            return;
                        }
                        
                        const ancestorId = path[currentIndex];
                        console.log('Checking ancestor:', ancestorId);
                        
                        const tree = f3Chart.store.getTree();
                        const ancestorDatum = tree.data.find(d => d.data.id === ancestorId);
                        
                        if (ancestorDatum) {
                            console.log('Found ancestor in tree:', ancestorId);
                            console.log('Ancestor structure:', ancestorDatum);
                            
                            // Check if this node has collapsed children
                            const hasCollapsedChildren = ancestorDatum._children && ancestorDatum._children.length > 0;
                            const hasVisibleChildren = ancestorDatum.children && ancestorDatum.children.length > 0;
                            
                            if (hasCollapsedChildren) {
                                console.log('Ancestor has collapsed children, toggling...');
                                f3.handlers.toggleRels(ancestorDatum, f3Chart);
                                currentIndex++;
                                setTimeout(expandNext, 600);
                            } else if (hasVisibleChildren) {
                                console.log('Ancestor has visible children, continuing...');
                                currentIndex++;
                                setTimeout(expandNext, 100);
                            } else {
                                console.log('Ancestor has no children, skipping...');
                                currentIndex++;
                                setTimeout(expandNext, 100);
                            }
                        } else {
                            console.log('Ancestor not in visible tree:', ancestorId);
                            currentIndex++;
                            setTimeout(expandNext, 100);
                        }
                    }
                    
                    expandNext();
                }, 600);
            });
        }
        
        // Navigate to person using shared function
        console.log('Making person the main person:', personId);
        setViewToPerson(personId);
        
        // Add visual highlight after navigation completes
        setTimeout(() => {
            const card = document.querySelector(`[data-id="${personId}"]`);
            if (card) {
                card.style.outline = '5px solid #ff6b6b';
                card.style.outlineOffset = '3px';
                card.style.backgroundColor = '#fff3cd';
                card.style.transform = 'scale(1.05)';
                card.style.transition = 'all 0.3s ease';
                
                setTimeout(() => {
                    card.style.outline = '';
                    card.style.outlineOffset = '';
                    card.style.backgroundColor = '';
                    card.style.transform = '';
                }, 3000);
            }
        }, 1200);
    }
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        searchResults.style.display = 'none';
    }
});

// Reset button functionality
const resetBtn = document.getElementById('resetBtn');
if (resetBtn && initialPersonId) {
    resetBtn.addEventListener('click', () => {
        console.log('Reset button clicked, returning to initial zoomed-out view');
        
        // Reset to the earliest person
        f3Chart.updateMainId(initialPersonId);
        
        // Return to initial fit-to-view (same as initial load)
        f3Chart.updateTree({initial: true, tree_position: 'fit'});
    });
}