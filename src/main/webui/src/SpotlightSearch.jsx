import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Text } from 'preact-i18n';
import { Document } from 'flexsearch';

import { Icon } from '@iconify/react';

function normalizeBookmarks(bmRes) {
    if (!bmRes || !Array.isArray(bmRes.groups)) return [];
    return bmRes.groups.flatMap(group =>
        (group.bookmarks || []).map(b => ({
            id: `bookmark:${group.name}:${b.name}:${b.url}`,
            name: b.name,
            group: group.name,
            url: b.url,
            icon: b.icon || 'mdi:bookmark-outline',
            iconColor: '#8e44ad', // purple for bookmarks
            openInNewTab: false,
            info: b.info || '',
            type: 'bookmark',
        }))
    );
}


function normalizeApps(groups) {
    return groups.flatMap(group =>
        (group.apps || group.applications).map(app => ({
            id: `app:${group.name}:${app.name}:${app.url}`,
            name: app.name,
            group: group.name,
            url: app.url,
            icon: app.icon || null,
            iconColor: app.iconColor,
            openInNewTab: app.openInNewTab || app.targetBlank || false,
            info: app.info || '',
            type: 'app',
        }))
    );
}

function TypeBadge({ type }) {
    if (type === 'bookmark') {
        // Purple badge, bookmark icon
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3em',
                marginLeft: '0.5em',
                background: '#f3f0fc',
                color: '#8e44ad',
                borderRadius: '0.7em',
                fontSize: '0.78em',
                padding: '0.1em 0.6em 0.1em 0.4em',
                fontWeight: 600,
            }}>
                <Icon icon="mdi:bookmark-outline" width={16} height={16} style={{ verticalAlign: 'middle' }} /> <Text id="search.resultsBadge.bookmark">Bookmark</Text>
            </span>
        );
    } else if (type === 'app') {
        // Blue badge, app icon
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3em',
                marginLeft: '0.5em',
                background: '#e3f2fd',
                color: '#1976d2',
                borderRadius: '0.7em',
                fontSize: '0.78em',
                padding: '0.1em 0.6em 0.1em 0.4em',
                fontWeight: 600,
            }}>
                <Icon icon="mdi:application" width={16} height={16} style={{ verticalAlign: 'middle' }} /> <Text id="search.resultsBadge.app">App</Text>
            </span>
        );
    }
    return null;
}


function renderIcon(icon, iconColor, name) {
    if (!icon) return null;
    if (icon.includes('://')) {
        return (
            <img
                src={icon}
                alt={name}
                class="me-3"
                width="32"
                height="32"
                style={{ color: iconColor }}
            />
        );
    }
    if (!icon.includes(':')) {
        icon = `mdi:${icon}`;
    }
    return (
        <Icon
            icon={icon}
            class="me-3 fs-5 text-primary"
            width="32"
            height="32"
            color={iconColor}
        />
    );
}

// At the top, before export
if (!window._navigate) {
    window._navigate = (url, inNewTab) => {
        if (inNewTab) {
            window.open(url, '_blank');
        } else {
            window.location.assign(url);
        }
    };
}

export default function SpotlightSearch({ testVisible = false }) {
    const [visible, setVisible] = useState(testVisible);
    const [query, setQuery] = useState('');
    const [apps, setApps] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const inputRef = useRef(null);
    const itemRefs = useRef([]);
    const indexRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (typeof testVisible === 'boolean') setVisible(testVisible);
    }, [testVisible]);

    // Listen for refresh events from the main app
    useEffect(() => {
        const handleRefresh = () => {
            setRefreshTrigger(prev => prev + 1);
        };
        window.addEventListener('startpunkt-refresh', handleRefresh);
        return () => window.removeEventListener('startpunkt-refresh', handleRefresh);
    }, []);

    useEffect(() => {
        async function fetchAll() {
            // Helper to fetch, handle 404/500 gracefully
            async function safeFetch(url) {
                try {
                    const res = await fetch(url);
                    if (!res.ok) {
                        if (res.status === 404) return null;
                        // You could do better error handling here
                        return null;
                    }
                    return await res.json();
                } catch (err) {
                    // Network error or bad JSON
                    return null;
                }
            }

            // Extract tags from URL path for filtering
            const getTagsFromUrl = () => {
                const pathname = window.location.pathname;
                // Remove leading slash and return tags if present
                const path = pathname.replace(/^\//, '');
                return path && path !== '' ? path : null;
            };

            const tags = getTagsFromUrl();
            const appsEndpoint = tags ? `/api/apps/${encodeURIComponent(tags)}` : '/api/apps';

            // Fetch both apps and bookmarks in parallel
            const [appRes, bmRes] = await Promise.all([
                safeFetch(appsEndpoint),
                safeFetch('/api/bookmarks')
            ]);

            // Defensive against missing .groups
            const allApps = appRes?.groups ? normalizeApps(appRes.groups) : [];
            const allBookmarks = normalizeBookmarks(bmRes);
            const allItems = [...allApps, ...allBookmarks];

            setApps(allItems);
            setFiltered(allItems);

            // Build combined FlexSearch index
            const index = new Document({
                document: {
                    id: 'id',
                    index: ['name'],
                    store: ['name', 'group', 'url', 'icon', 'iconColor', 'openInNewTab', 'info', 'type'],
                },
                tokenize: 'forward',
                normalize: 'full',
            });

            allItems.forEach(item => index.add(item));
            indexRef.current = index;
        }
        fetchAll();
    }, [refreshTrigger]);

    useEffect(() => {
        if (query.trim() && indexRef.current) {
            const results = [
                ...indexRef.current.search(query, { field: 'name', enrich: true }),
            ];
            const seen = new Set();
            const matches = results
                .flatMap(r => r.result)
                .map(r => r.doc)
                .filter(app => {
                    if (!app || !app.url || seen.has(app.url)) return false;
                    seen.add(app.url);
                    return true;
                });
            setFiltered(matches);
        } else {
            setFiltered(apps);
        }
        setSelectedIndex(-1);
    }, [query, apps]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't capture keystrokes if user is typing in an input or textarea
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            
            // Open search with / key
            if (!visible && e.key === '/') {
                e.preventDefault();
                setVisible(true);
                setTimeout(() => inputRef.current?.focus(), 0);
                return;
            }
            
            const isTypingChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
            if (!visible && isTypingChar) {
                setVisible(true);
                setQuery(e.key);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [visible]);

    useEffect(() => {
        if (!visible) return;

        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [visible]);

    const scrollItemIntoView = (index) => {
        const el = itemRefs.current[index];
        if (el) el.scrollIntoView({ block: 'nearest' });
    };

    if (!visible) return null;

    itemRefs.current = [];

    function onSelect(app) {
        window._navigate(app.url, app.openInNewTab);
        setVisible(false);
    }

    return (
        <div 
            ref={containerRef} 
            style={overlayStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="spotlight-search-label"
        >
            <h2 id="spotlight-search-label" class="visually-hidden"><Text id="search.title">Search applications and bookmarks</Text></h2>
            <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={query}
                onInput={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        setVisible(false);
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = (selectedIndex + 1) % filtered.length;
                        setSelectedIndex(next);
                        scrollItemIntoView(next);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = (selectedIndex - 1 + filtered.length) % filtered.length;
                        setSelectedIndex(prev);
                        scrollItemIntoView(prev);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        const index = selectedIndex >= 0 ? selectedIndex : 0;
                        const app = filtered[index];
                        if (app?.url) {
                            onSelect(app);
                            setVisible(false);
                        }
                    }
                }}
                style={inputStyle}
                aria-label="Search for applications and bookmarks"
                aria-controls="search-results"
                aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
            />

            <ul 
                style={resultsStyle}
                id="search-results"
                role="listbox"
                aria-label="Search results"
            >
                {query.trim() && filtered.length === 0 && (
                    <li role="status" aria-live="polite" style={{ padding: '0.5rem', color: '#888' }}><Text id="search.noResults">No results</Text></li>
                )}

                {filtered.map((app, index) => (
                    <li
                        key={app.id}
                        id={`search-result-${index}`}
                        ref={(el) => itemRefs.current[index] = el}
                        role="option"
                        aria-selected={index === selectedIndex}
                        style={{
                            ...itemStyle,
                            backgroundColor: index === selectedIndex ? '#eee' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                        onClick={() => {
                            window._navigate(app.url, app.openInNewTab);
                            setVisible(false);
                        }}
                    >
                        {renderIcon(app.icon, app.iconColor, app.name)}
                        <div>
                            <strong>
                                {app.name}
                            <TypeBadge type={app.type} />
                            </strong>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                {app.group} {app.info ? `– ${app.info}` : ''}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

        </div>
    );
}

const overlayStyle = {
    position: 'fixed',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'white',
    width: '500px',
    padding: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    zIndex: 1000,
    borderRadius: '8px',
};

const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
};

const resultsStyle = {
    listStyle: 'none',
    margin: '0.5rem 0 0 0',
    padding: 0,
    maxHeight: '300px',
    overflowY: 'auto',
};

const itemStyle = {
    padding: '0.5rem',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
};
