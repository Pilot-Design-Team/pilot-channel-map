import { useState, useEffect } from 'react'
import Head from 'next/head'
import { channelMapData } from '../data/channel-map'
import styles from '../styles/Dashboard.module.css'

const channelColors = {
  "🎙": { bg: "#f8edff", text: "#5f2ee5", border: "rgba(95, 46, 229, 0.15)", name: "Podcast" },
  "✉": { bg: "#fcf3d6", text: "#967000", border: "rgba(150, 112, 0, 0.15)", name: "Newsletter" },
  "✍": { bg: "rgba(254, 225, 127, 0.15)", text: "#967000", border: "rgba(150, 112, 0, 0.2)", name: "Blog" },
  "▶": { bg: "rgba(248, 145, 255, 0.1)", text: "#ce1836", border: "rgba(206, 24, 54, 0.15)", name: "YouTube" },
  "𝕏": { bg: "#edeef5", text: "#3f3c3d", border: "rgba(63, 60, 61, 0.15)", name: "Twitter/X" },
  "in": { bg: "rgba(79, 155, 243, 0.1)", text: "#281350", border: "rgba(40, 19, 80, 0.15)", name: "LinkedIn" },
  "🎤": { bg: "rgba(110, 150, 5, 0.1)", text: "#6e9605", border: "rgba(110, 150, 5, 0.2)", name: "Speaking" },
  "📖": { bg: "#f891ff1a", text: "#b341ba", border: "rgba(248, 145, 255, 0.3)", name: "Book" }
}

const sectors = [
  { id: 'all', label: 'All Sectors' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'franchise', label: 'Franchise' },
  { id: 'smb', label: 'SMB' },
  { id: 'tech', label: 'Tech' },
  { id: 'professional-services', label: 'Professional Services' }
]

const renderMarkdown = (text) => {
  if (!text) return ''
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

export default function Home() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Dashboard states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedChannels, setSelectedChannels] = useState([])

  useEffect(() => {
    // Check if user is already authenticated
    const sessionToken = localStorage.getItem('pilot_session')
    if (sessionToken === 'pilot_t100_auth_success_2026') {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()

      if (data.success) {
        localStorage.setItem('pilot_session', data.token)
        setIsAuthenticated(true)
      } else {
        setAuthError(data.error || 'Incorrect password')
      }
    } catch (err) {
      setAuthError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('pilot_session')
    setIsAuthenticated(false)
    setPassword('')
  }

  const toggleChannelFilter = (icon) => {
    if (selectedChannels.includes(icon)) {
      setSelectedChannels(selectedChannels.filter(c => c !== icon))
    } else {
      setSelectedChannels([...selectedChannels, icon])
    }
  }

  // Dual-level filtering logic: sector first, then sub-category, then search & channel
  const getFilteredItems = (sectorId, catId, query, channels) => {
    let items = []
    
    // 1. Filter by Sector
    if (sectorId === 'all') {
      items = channelMapData.categories.flatMap(c => c.items.map(item => ({ ...item, categoryTitle: c.title, categoryId: c.id })))
    } else {
      items = channelMapData.categories.flatMap(c => 
        c.items
          .filter(item => item.segment === sectorId)
          .map(item => ({ ...item, categoryTitle: c.title, categoryId: c.id }))
      )
    }

    // 2. Filter by sub-category
    if (catId !== 'all') {
      items = items.filter(item => item.categoryId === catId)
    }

    // 3. Filter by Search Query & Channels
    return items.filter(item => {
      const textMatch = 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.roleOrg.toLowerCase().includes(query.toLowerCase()) ||
        item.notableContent.toLowerCase().includes(query.toLowerCase())

      const channelMatch = 
        channels.length === 0 || 
        channels.every(ch => item.channels.includes(ch))

      return textMatch && channelMatch
    })
  }

  // Calculate dynamic channel prevalence for the selected sector
  const getDynamicPrevalence = (sectorId) => {
    let items = []
    if (sectorId === 'all') {
      items = channelMapData.categories.flatMap(c => c.items)
    } else {
      items = channelMapData.categories.flatMap(c => c.items.filter(item => item.segment === sectorId))
    }

    const total = items.length || 1
    const counts = {}
    channelMapData.key.forEach(k => {
      counts[k.icon] = 0
    })

    items.forEach(item => {
      item.channels.forEach(ch => {
        if (counts[ch] !== undefined) {
          counts[ch]++
        }
      })
    })

    return channelMapData.key.map(k => ({
      icon: k.icon,
      label: k.label,
      count: counts[k.icon],
      total: total
    })).sort((a, b) => b.count - a.count)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading Gateway...</p>
      </div>
    )
  }

  // Auth gate render
  if (!isAuthenticated) {
    return (
      <div className={styles.loginPage}>
        <Head>
          <title>Access Gateway — Pilot Channel Map</title>
          <meta name="description" content="Password-protected access gateway for Pilot team members." />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        </Head>
        <div className={styles.loginCard}>
          <div className={styles.logoBadge}>PILOT</div>
          <h1>Top 100 Content Channel Map</h1>
          <p className={styles.subtitle}>
            Internal directory detailing where the industry's most influential people publish.
          </p>
          <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="password">Enter Access Code</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            {authError && <div className={styles.errorMessage}>{authError}</div>}
            <button type="submit" className={styles.loginBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Enter Dashboard'}
            </button>
          </form>
          <div className={styles.loginFooter}>
            Strictly confidential. Pilot team access only.
          </div>
        </div>
      </div>
    )
  }

  // Dashboard render
  const filteredList = getFilteredItems(selectedSector, selectedCategory, searchQuery, selectedChannels)

  return (
    <div className={styles.dashboardLayout}>
      <Head>
        <title>Content Channel Map — Pilot</title>
        <meta name="description" content="An interactive database of where industry leaders create content, built for Pilot." />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitleArea}>
          <div className={styles.headerBadge}>PILOT INTERNAL</div>
          <h1>Influencer Content Channel Map</h1>
          <p className={styles.headerSubtitle}>
            Cross-Sector Thought Leadership Directory • Research: May–June 2026
          </p>
        </div>
        <button onClick={handleSignOut} className={styles.signOutBtn}>
          Exit Portal
        </button>
      </header>

      {/* Strategic Insights Grid (Dynamic 2-Column Dashboard) */}
      <div className={styles.insightsGrid}>

        {/* Column 1: Prevalence Chart */}
        <div className={styles.insightCard}>
          <h2>Channel Prevalence</h2>
          <p className={styles.cardSubtitle}>
            Active content channel distribution for the selected sector.
          </p>
          <div className={styles.prevalenceChart}>
            {getDynamicPrevalence(selectedSector).map((item, idx) => {
              const meta = channelColors[item.icon] || { text: '#fff' }
              const percentage = Math.round((item.count / item.total) * 100)
              
              return (
                <div key={idx} className={styles.chartRow}>
                  <div className={styles.chartLabel}>
                    <span className={styles.chartIcon} style={{ color: meta.text }}>{item.icon}</span>
                    <span>{item.label}</span>
                    <span className={styles.chartCount}>{item.count}/{item.total}</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: meta.text,
                      }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Column 2: Channel Definition Key */}
        <div className={styles.insightCard}>
          <h2>Channel Definition Key</h2>
          <p className={styles.cardSubtitle}>
            Core definitions of communication channels in the database.
          </p>
          <div className={styles.keyGrid}>
            {channelMapData.key.map(k => (
              <div key={k.icon} className={styles.keyRow}>
                <span className={styles.keyIcon} style={{ color: channelColors[k.icon]?.text }}>{k.icon}</span>
                <div>
                  <strong>{k.label}</strong>
                  <div className={styles.keyDesc}>{k.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explorer Column (Search & Table) */}
      <div className={styles.explorerColumn}>
        
        {/* Filters card */}
        <div className={styles.filterCard}>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, organization, role or content keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={styles.clearSearchBtn}>
                &times;
              </button>
            )}
          </div>

          <div className={styles.sectorFilterSection}>
            <h3>Filter by sector:</h3>
            <div className={styles.sectorBar}>
              {sectors.map(sector => {
                const isActive = selectedSector === sector.id
                return (
                  <button
                    key={sector.id}
                    onClick={() => {
                      setSelectedSector(sector.id)
                      setSelectedCategory('all') // Reset sub-category tab
                    }}
                    className={`${styles.sectorBtn} ${isActive ? styles.activeSectorBtn : ''}`}
                  >
                    {sector.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.channelFilterSection}>
            <h3>Filter by active channels:</h3>
            <div className={styles.channelPills}>
              {channelMapData.key.map(ch => {
                const isActive = selectedChannels.includes(ch.icon)
                const meta = channelColors[ch.icon] || { bg: 'rgba(255,255,255,0.05)', text: '#fff', border: 'transparent' }
                return (
                  <button
                    key={ch.icon}
                    onClick={() => toggleChannelFilter(ch.icon)}
                    className={`${styles.channelFilterPill} ${isActive ? styles.activeChannelPill : ''}`}
                    style={{
                      '--pill-bg': meta.bg,
                      '--pill-text': meta.text,
                      '--pill-border': meta.border,
                      borderColor: isActive ? meta.text : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <span>{ch.icon}</span>
                    <span className={styles.pillLabel}>{ch.label}</span>
                  </button>
                )
              })}
            </div>
            {selectedChannels.length > 0 && (
              <button onClick={() => setSelectedChannels([])} className={styles.resetFiltersBtn}>
                Reset Channel Filters
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Category Navigation Tabs */}
        <nav className={styles.tabsNav}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`${styles.tabBtn} ${selectedCategory === 'all' ? styles.activeTabBtn : ''}`}
          >
            All Categories
            <span className={styles.tabCount}>
              {getFilteredItems(selectedSector, 'all', searchQuery, selectedChannels).length}
            </span>
          </button>
          {channelMapData.categories.slice(0, 5).map(cat => {
            const count = getFilteredItems(selectedSector, cat.id, searchQuery, selectedChannels).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`${styles.tabBtn} ${selectedCategory === cat.id ? styles.activeTabBtn : ''}`}
              >
                {cat.title}
                <span className={styles.tabCount}>{count}</span>
              </button>
            )
          })}
        </nav>

        {/* Results List */}
        <div className={styles.resultsArea}>
          <div className={styles.resultsHeader}>
            Showing {filteredList.length} influencers
          </div>

          {filteredList.length === 0 ? (
            <div className={styles.noResultsCard}>
              <svg className={styles.noResultsIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>No influencers match your filter</h3>
              <p>Try clearing your search query or removing some active channels.</p>
              <button
                className={styles.resetAllBtn}
                onClick={() => {
                  setSearchQuery('')
                  setSelectedChannels([])
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role / Organization</th>
                      <th>Channels</th>
                      <th>Notable Content / Outreach</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((item, idx) => {
                      const searchParam = encodeURIComponent(`${item.name} ${item.roleOrg}`);
                      const linkedinSearchUrl = item.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${searchParam}`;
                      
                      return (
                        <tr key={idx} className={styles.tableRow}>
                          <td className={styles.nameCell}>
                            <a 
                              href={linkedinSearchUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={styles.nameLink}
                            >
                              {item.name}
                            </a>
                          </td>
                          <td className={styles.roleCell}>
                            {item.roleOrg}
                          </td>
                          <td className={styles.channelsCell}>
                            <div className={styles.cellChannelIcons}>
                              {item.channels.map(ch => {
                                const meta = channelColors[ch] || { bg: 'rgba(255,255,255,0.05)', text: '#fff' }
                                const badgeElement = (
                                  <span
                                    className={styles.channelBadge}
                                    title={meta.name}
                                    style={{
                                      backgroundColor: meta.bg,
                                      color: meta.text,
                                      borderColor: meta.border
                                    }}
                                  >
                                    {ch}
                                  </span>
                                );

                                if (ch === 'in') {
                                  return (
                                    <a
                                      key={ch}
                                      href={linkedinSearchUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: 'inline-flex', textDecoration: 'none' }}
                                    >
                                      {badgeElement}
                                    </a>
                                  );
                                }

                                return <span key={ch} style={{ display: 'inline-flex' }}>{badgeElement}</span>;
                              })}
                            </div>
                          </td>
                          <td className={styles.notableCell}>
                            {renderMarkdown(item.notableContent)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className={styles.dashboardFooter}>
        <p>CONFIDENTIAL &bull; FOR INTERNAL PILOT USE ONLY &bull; &copy; 2026 Pilot.com, Inc. All rights reserved.</p>
      </footer>
    </div>
  )
}
