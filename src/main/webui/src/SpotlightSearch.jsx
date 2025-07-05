import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Document } from 'flexsearch';

import { Icon } from '@iconify/react';

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
    const inputRef = useRef(null);
    const itemRefs = useRef([]);
    const indexRef = useRef(null);

    useEffect(() => {
        if (typeof testVisible === 'boolean') setVisible(testVisible);
    }, [testVisible]);

    useEffect(() => {
        fetch('/api/apps')
            .then(res => res.json())
            .then(data => {
                // Change this line to match your API structure:
                const allApps = data.groups.flatMap(group =>
                    (group.apps || group.applications).map(app => ({
                        id: `${group.name}:${app.name}:${app.url}`,
                        name: app.name,
                        group: group.name,
                        url: app.url,
                        icon: app.icon || null,
                        openInNewTab: app.openInNewTab || app.targetBlank || false,
                        info: app.info || '',
                    }))
                );
                setApps(allApps);
                setFiltered(allApps);
                const index = new Document({
                    document: {
                        id: 'id',
                        index: ['name'],
                        store: ['name', 'group', 'url', 'icon', 'openInNewTab', 'info'],
                    },
                    tokenize: 'forward',
                    normalize: 'full',
                });
                allApps.forEach(app => index.add(app));
                indexRef.current = index;
            });
    }, []);

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
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        const handleKeyDown = (e) => {
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
        <div style={overlayStyle}>
            <input
                ref={inputRef}
                type="text"
                placeholder="Search apps..."
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
            />

            <ul style={resultsStyle}>
                {filtered.length === 0 && (
                    <li style={{ padding: '0.5rem', color: '#888' }}>No results</li>
                )}
                {filtered.map((app, index) => (
                    <li
                        key={app.id}
                        ref={(el) => itemRefs.current[index] = el}
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
                            <strong>{app.name}</strong>
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
