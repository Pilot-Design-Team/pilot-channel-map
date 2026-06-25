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

// RFC 4180 compliant CSV parser
function parseCSV(text) {
  const result = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\r' || char === '\n') {
        row.push(cell);
        cell = '';
        if (row.some(c => c.trim() !== '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (row.some(c => c.trim() !== '')) {
      result.push(row);
    }
  }
  return result;
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
  const [categoriesData, setCategoriesData] = useState(channelMapData.categories)

  // Tools states
  const [isToolsExpanded, setIsToolsExpanded] = useState(false)
  const [activeToolTab, setActiveToolTab] = useState('form')

  // Form states
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formSector, setFormSector] = useState('accounting')
  const [formCategory, setFormCategory] = useState('active-content-creators')
  const [formChannels, setFormChannels] = useState([])
  const [formLinkedin, setFormLinkedin] = useState('')
  const [formNotable, setFormNotable] = useState('')
  const [formEngagementStatus, setFormEngagementStatus] = useState('')
  const [formEpisodeLink, setFormEpisodeLink] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Upload states
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadPreview, setUploadPreview] = useState([])
  const [isDragActive, setIsDragActive] = useState(false)

  useEffect(() => {
    // Load custom influencers from localStorage
    const savedCustom = localStorage.getItem('pilot_custom_influencers')
    if (savedCustom) {
      try {
        const customItems = JSON.parse(savedCustom)
        const categoriesCopy = JSON.parse(JSON.stringify(channelMapData.categories))
        customItems.forEach(item => {
          const cat = categoriesCopy.find(c => c.id === item.categoryId)
          if (cat) {
            const exists = cat.items.some(x => x.name.toLowerCase() === item.name.toLowerCase())
            if (!exists) {
              cat.items.push(item)
            }
          }
        })
        setCategoriesData(categoriesCopy)
      } catch (err) {
        console.error("Failed to load custom influencers", err)
      }
    }

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

  // Handle manual influencer submission
  const handleAddInfluencerSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!formName.trim() || !formRole.trim()) {
      setFormError('Name and Role/Organization are required.')
      return
    }

    const newInfluencer = {
      name: formName.trim(),
      roleOrg: formRole.trim(),
      channels: formChannels.length > 0 ? formChannels : ['in'],
      notableContent: formNotable.trim() || 'Custom influencer added to directory.',
      segment: formSector,
      categoryId: formCategory
    }

    if (formLinkedin.trim()) {
      newInfluencer.linkedinUrl = formLinkedin.trim()
    }

    if (formEngagementStatus.trim()) {
      newInfluencer.engagementStatus = formEngagementStatus.trim()
    }

    if (formEpisodeLink.trim()) {
      newInfluencer.episodeLink = formEpisodeLink.trim()
    }

    // Add to state
    const categoriesCopy = JSON.parse(JSON.stringify(categoriesData))
    const cat = categoriesCopy.find(c => c.id === formCategory)
    if (cat) {
      const exists = cat.items.some(x => x.name.toLowerCase() === newInfluencer.name.toLowerCase())
      if (exists) {
        setFormError('An influencer with this name already exists in the directory.')
        return
      }
      cat.items.push(newInfluencer)
    } else {
      setFormError('Invalid category selection.')
      return
    }

    setCategoriesData(categoriesCopy)

    // Save to localStorage
    const savedCustom = localStorage.getItem('pilot_custom_influencers')
    const customItems = savedCustom ? JSON.parse(savedCustom) : []
    customItems.push(newInfluencer)
    localStorage.setItem('pilot_custom_influencers', JSON.stringify(customItems))

    // Clear form
    setFormName('')
    setFormRole('')
    setFormChannels([])
    setFormLinkedin('')
    setFormNotable('')
    setFormEngagementStatus('')
    setFormEpisodeLink('')
    setFormSuccess('Influencer added successfully!')
  }

  // Handle drag and drop events
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target.result
        try {
          if (file.name.endsWith('.json')) {
            const parsed = JSON.parse(text)
            const items = Array.isArray(parsed) ? parsed : (parsed.items || [])
            processImportedItems(items)
          } else if (file.name.endsWith('.csv')) {
            const parsedRows = parseCSV(text)
            processImportedCSV(parsedRows)
          } else {
            setUploadError('Unsupported file format. Please upload a .csv or .json file.')
          }
        } catch (err) {
          setUploadError('Failed to parse file: ' + err.message)
        }
      }
      reader.readAsText(file)
    }
  }

  // Handle client-side file parsing
  const handleFileUpload = (e) => {
    setUploadError('')
    setUploadSuccess('')
    setUploadPreview([])

    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text)
          const items = Array.isArray(parsed) ? parsed : (parsed.items || [])
          processImportedItems(items)
        } else if (file.name.endsWith('.csv')) {
          const parsedRows = parseCSV(text)
          processImportedCSV(parsedRows)
        } else {
          setUploadError('Unsupported file format. Please upload a .csv or .json file.')
        }
      } catch (err) {
        setUploadError('Failed to parse file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const processImportedCSV = (rows) => {
    if (rows.length === 0) {
      setUploadError('The CSV file is empty.')
      return
    }

    let headerIndex = -1
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some(cell => /Name/i.test(cell) || /Influencer/i.test(cell))) {
        headerIndex = i
        break
      }
    }
    if (headerIndex === -1) headerIndex = 0

    const headers = rows[headerIndex].map(h => h.trim())
    const nameIdx = headers.findIndex(h => /Influencer Name/i.test(h) || h.toLowerCase() === 'name')
    const roleIdx = headers.findIndex(h => /Job Title/i.test(h) || /Company/i.test(h) || /Role/i.test(h) || /Organization/i.test(h))
    const descIdx = headers.findIndex(h => /How do they describe/i.test(h) || /describe/i.test(h) || /bio/i.test(h) || /description/i.test(h) || /notable/i.test(h))
    const socialIdx = headers.findIndex(h => /Link to main social/i.test(h) || /profile/i.test(h) || /LinkedIn/i.test(h))
    const segmentIdx = headers.findIndex(h => /Sector/i.test(h) || /Segment/i.test(h) || /Category/i.test(h))
    const statusIdx = headers.findIndex(h => /Engagement Status/i.test(h) || /Status/i.test(h) || /Engagement/i.test(h))
    const episodeIdx = headers.findIndex(h => /Episode Link/i.test(h) || /Asset Link/i.test(h) || /Episode\/Asset Link/i.test(h) || /Webinar Link/i.test(h) || (/Link/i.test(h) && h.toLowerCase() !== 'linkedin' && h.toLowerCase() !== 'profile'))

    if (nameIdx === -1) {
      setUploadError('Could not locate a "Name" or "Influencer Name" column in the CSV file.')
      return
    }

    const dataRows = rows.slice(headerIndex + 1)
    const parsedItems = []

    dataRows.forEach(row => {
      if (row.length === 0) return
      const name = row[nameIdx] ? row[nameIdx].trim() : ''
      if (!name || name === 'Influencer Name' || name.startsWith('Keywords Used')) return

      const roleOrg = roleIdx !== -1 && row[roleIdx] ? row[roleIdx].replace(/\s+/g, ' ').trim() : 'Influencer'
      const bio = descIdx !== -1 && row[descIdx] ? row[descIdx].replace(/\s+/g, ' ').trim() : ''
      const socialLink = socialIdx !== -1 && row[socialIdx] ? row[socialIdx].trim() : ''
      
      let segment = 'accounting'
      if (segmentIdx !== -1 && row[segmentIdx]) {
        const segVal = row[segmentIdx].toLowerCase()
        if (segVal.includes('tech') || segVal.includes('saas') || segVal.includes('startup') || segVal.includes('vc')) {
          segment = 'tech'
        } else if (segVal.includes('franchise')) {
          segment = 'franchise'
        } else if (segVal.includes('smb') || segVal.includes('small business')) {
          segment = 'smb'
        } else if (segVal.includes('professional') || segVal.includes('services')) {
          segment = 'professional-services'
        }
      } else {
        const searchStr = `${name} ${roleOrg} ${bio}`.toLowerCase()
        if (searchStr.includes('cpa')) {
          segment = 'accounting'
        } else if (searchStr.includes('small business') || searchStr.includes('smallbiz') || searchStr.includes('entrepreneur')) {
          segment = 'smb'
        } else if (searchStr.includes('vc') || searchStr.includes('venture') || searchStr.includes('startup') || searchStr.includes('saas')) {
          segment = 'tech'
        } else if (searchStr.includes('agency') || searchStr.includes('marketing') || searchStr.includes('consult')) {
          segment = 'professional-services'
        }
      }

      const channels = ['in']
      const searchStr = `${roleOrg} ${bio} ${socialLink}`.toLowerCase()
      if (searchStr.includes('podcast') || searchStr.includes('show') || searchStr.includes('host')) {
        channels.push('🎙')
      }
      if (searchStr.includes('book') || searchStr.includes('author') || searchStr.includes('publish')) {
        channels.push('📖')
      }
      if (searchStr.includes('speaker') || searchStr.includes('speaking') || searchStr.includes('keynote')) {
        channels.push('🎤')
      }
      if (searchStr.includes('blog') || searchStr.includes('article') || searchStr.includes('writes')) {
        if (searchStr.includes('newsletter')) {
          channels.push('✉')
        } else {
          channels.push('✍')
        }
      }
      if (searchStr.includes('youtube') || searchStr.includes('video')) {
        channels.push('▶')
      }
      if (searchStr.includes('twitter') || searchStr.includes('x.com')) {
        channels.push('𝕏')
      }

      const statusVal = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : ''
      const episodeLink = episodeIdx !== -1 && row[episodeIdx] ? row[episodeIdx].trim() : ''

      const item = {
        name,
        roleOrg,
        channels: Array.from(new Set(channels)),
        notableContent: bio ? (bio.length > 200 ? bio.substring(0, 197) + '...' : bio) : 'Imported influencer.',
        segment,
        categoryId: 'active-content-creators'
      }

      if (socialLink && (socialLink.includes('linkedin.com') || socialLink.startsWith('https://www.linkedin.com'))) {
        item.linkedinUrl = socialLink
      }

      if (statusVal) {
        item.engagementStatus = statusVal
      }

      if (episodeLink) {
        item.episodeLink = episodeLink
      }

      parsedItems.push(item)
    })

    if (parsedItems.length === 0) {
      setUploadError('No valid influencer records found in the CSV.')
      return
    }

    setUploadPreview(parsedItems)
    setUploadSuccess(`Successfully parsed ${parsedItems.length} influencers. Review below and click Import.`)
  }

  const processImportedItems = (items) => {
    const parsedItems = items.map(inf => {
      if (!inf.name) return null
      return {
        name: inf.name,
        roleOrg: inf.roleOrg || 'Influencer',
        channels: Array.isArray(inf.channels) ? inf.channels : ['in'],
        notableContent: inf.notableContent || 'Imported influencer.',
        segment: inf.segment || 'accounting',
        categoryId: inf.categoryId || 'active-content-creators',
        ...(inf.linkedinUrl ? { linkedinUrl: inf.linkedinUrl } : {}),
        ...(inf.engagementStatus ? { engagementStatus: inf.engagementStatus } : {}),
        ...(inf.episodeLink ? { episodeLink: inf.episodeLink } : {})
      }
    }).filter(Boolean)

    if (parsedItems.length === 0) {
      setUploadError('No valid influencer records found in the JSON.')
      return
    }

    setUploadPreview(parsedItems)
    setUploadSuccess(`Successfully parsed ${parsedItems.length} influencers. Review below and click Import.`)
  }

  const handleConfirmImport = () => {
    if (uploadPreview.length === 0) return

    const categoriesCopy = JSON.parse(JSON.stringify(categoriesData))
    const savedCustom = localStorage.getItem('pilot_custom_influencers')
    const customItems = savedCustom ? JSON.parse(savedCustom) : []

    let importedCount = 0

    uploadPreview.forEach(item => {
      const cat = categoriesCopy.find(c => c.id === item.categoryId)
      if (cat) {
        const exists = cat.items.some(x => x.name.toLowerCase() === item.name.toLowerCase())
        if (!exists) {
          cat.items.push(item)
          customItems.push(item)
          importedCount++
        }
      }
    })

    setCategoriesData(categoriesCopy)
    localStorage.setItem('pilot_custom_influencers', JSON.stringify(customItems))

    setUploadPreview([])
    setUploadSuccess(`Successfully imported ${importedCount} new influencers to the directory!`)
  }

  const handleExportCSV = () => {
    const headers = [
      'Influencer Name',
      'Job Title, Company',
      'Channels',
      'Notable Content / Outreach',
      'Sector',
      'Category',
      'LinkedIn Profile',
      'Engagement Status',
      'Episode/Asset Link'
    ]

    const rows = []
    categoriesData.forEach(cat => {
      cat.items.forEach(item => {
        rows.push([
          item.name,
          item.roleOrg,
          item.channels.join(' '),
          item.notableContent,
          item.segment,
          cat.title,
          item.linkedinUrl || '',
          item.engagementStatus || '',
          item.episodeLink || ''
        ])
      })
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const escaped = val.replace(/"/g, '""')
          return `"${escaped}"`
        }).join(',')
      )
    ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `pilot_content_channel_map_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Dual-level filtering logic: sector first, then sub-category, then search & channel
  const getFilteredItems = (sectorId, catId, query, channels) => {
    let items = []
    
    // 1. Filter by Sector
    if (sectorId === 'all') {
      items = categoriesData.flatMap(c => c.items.map(item => ({ ...item, categoryTitle: c.title, categoryId: c.id })))
    } else {
      items = categoriesData.flatMap(c => 
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
        item.notableContent.toLowerCase().includes(query.toLowerCase()) ||
        (item.engagementStatus && item.engagementStatus.toLowerCase().includes(query.toLowerCase()))

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
      items = categoriesData.flatMap(c => c.items)
    } else {
      items = categoriesData.flatMap(c => c.items.filter(item => item.segment === sectorId))
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

      {/* Database Management Tools Card */}
      <div className={styles.toolCard}>
        <div className={styles.toolHeader} onClick={() => setIsToolsExpanded(!isToolsExpanded)}>
          <div className={styles.toolHeaderTitle}>
            <svg className={`${styles.toolChevron} ${isToolsExpanded ? styles.expanded : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l4 4 4-4" />
            </svg>
            <h2>Database Management Tools</h2>
            <span className={styles.toolSubtitle}>Add, upload, or export influencers in the directory</span>
          </div>
          <button 
            type="button" 
            className={styles.exportBtn} 
            onClick={(e) => {
              e.stopPropagation();
              handleExportCSV();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Database (CSV)
          </button>
        </div>

        {isToolsExpanded && (
          <div className={styles.toolBody}>
            <div className={styles.toolTabs}>
              <button 
                type="button"
                className={`${styles.toolTabBtn} ${activeToolTab === 'form' ? styles.activeToolTabBtn : ''}`}
                onClick={() => setActiveToolTab('form')}
              >
                Add Influencer
              </button>
              <button 
                type="button"
                className={`${styles.toolTabBtn} ${activeToolTab === 'upload' ? styles.activeToolTabBtn : ''}`}
                onClick={() => setActiveToolTab('upload')}
              >
                Import List (CSV/JSON)
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeToolTab === 'form' ? (
                <form onSubmit={handleAddInfluencerSubmit} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="formName">Influencer Name *</label>
                    <input
                      id="formName"
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className={styles.toolInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="formRole">Job Title & Company *</label>
                    <input
                      id="formRole"
                      type="text"
                      placeholder="e.g. Founder, Startup X"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      required
                      className={styles.toolInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="formSector">Sector *</label>
                    <select
                      id="formSector"
                      value={formSector}
                      onChange={(e) => setFormSector(e.target.value)}
                      className={styles.toolSelect}
                    >
                      {sectors.filter(s => s.id !== 'all').map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="formCategory">Category *</label>
                    <select
                      id="formCategory"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className={styles.toolSelect}
                    >
                      {categoriesData.slice(0, 5).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label>Active Channels</label>
                    <div className={styles.formChannelPills}>
                      {channelMapData.key.map(ch => {
                        const isSelected = formChannels.includes(ch.icon)
                        const meta = channelColors[ch.icon] || { bg: 'rgba(255,255,255,0.05)', text: '#fff', border: 'transparent' }
                        return (
                          <button
                            key={ch.icon}
                            type="button"
                            onClick={() => {
                              if (formChannels.includes(ch.icon)) {
                                setFormChannels(formChannels.filter(c => c !== ch.icon))
                              } else {
                                setFormChannels([...formChannels, ch.icon])
                              }
                            }}
                            className={`${styles.formChannelPill} ${isSelected ? styles.activeFormChannelPill : ''}`}
                            style={{
                              '--pill-bg': meta.bg,
                              '--pill-text': meta.text,
                              '--pill-border': meta.border,
                              borderColor: isSelected ? meta.text : 'rgba(0,0,0,0.1)'
                            }}
                          >
                            <span>{ch.icon}</span>
                            <span>{ch.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="formLinkedin">LinkedIn Profile URL (Optional)</label>
                    <input
                      id="formLinkedin"
                      type="url"
                      placeholder="https://www.linkedin.com/in/username"
                      value={formLinkedin}
                      onChange={(e) => setFormLinkedin(e.target.value)}
                      className={styles.toolInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="formEpisodeLink">Episode / Asset Link (Optional)</label>
                    <input
                      id="formEpisodeLink"
                      type="url"
                      placeholder="https://libsyn.com/... or youtube.com/..."
                      value={formEpisodeLink}
                      onChange={(e) => setFormEpisodeLink(e.target.value)}
                      className={styles.toolInput}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="formEngagementStatus">Engagement Status (Optional)</label>
                    <input
                      id="formEngagementStatus"
                      type="text"
                      placeholder="e.g. Episode recorded June 1, published June 24 / In talks"
                      value={formEngagementStatus}
                      onChange={(e) => setFormEngagementStatus(e.target.value)}
                      className={styles.toolInput}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="formNotable">Notable Content / Outreach Bio (Optional)</label>
                    <textarea
                      id="formNotable"
                      rows="3"
                      placeholder="Highlight key books, podcasts, or descriptions of their outreach..."
                      value={formNotable}
                      onChange={(e) => setFormNotable(e.target.value)}
                      className={styles.toolTextarea}
                    />
                  </div>

                  {formError && <div className={styles.formErrorMsg}>{formError}</div>}
                  {formSuccess && <div className={styles.formSuccessMsg}>{formSuccess}</div>}

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button type="submit" className={styles.submitBtn}>
                      Add Influencer to Directory
                    </button>
                  </div>
                </form>
              ) : (
                <div className={styles.uploadContainer}>
                  <div 
                    className={`${styles.uploadDropZone} ${isDragActive ? styles.dragActive : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.uploadZoneIcon}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p>Drag and drop a <strong>.csv</strong> or <strong>.json</strong> file here, or click to browse</p>
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className={styles.fileInputHidden}
                      id="fileInput"
                    />
                    <label htmlFor="fileInput" className={styles.browseFileBtn}>Browse Files</label>
                  </div>

                  {uploadError && <div className={styles.formErrorMsg}>{uploadError}</div>}
                  {uploadSuccess && <div className={styles.formSuccessMsg}>{uploadSuccess}</div>}

                  {uploadPreview.length > 0 && (
                    <div className={styles.previewSection}>
                      <h3>Preview Imported Data ({uploadPreview.length} influencers)</h3>
                      <div className={styles.previewTableWrapper}>
                        <table className={styles.previewTable}>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Role/Company</th>
                              <th>Sector</th>
                              <th>Channels</th>
                              <th>Status</th>
                              <th>Asset Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadPreview.slice(0, 5).map((item, idx) => (
                              <tr key={idx}>
                                <td><strong>{item.name}</strong></td>
                                <td>{item.roleOrg}</td>
                                <td><span className={styles.previewSectorBadge}>{item.segment}</span></td>
                                <td>{item.channels.join(' ')}</td>
                                <td>{item.engagementStatus || '—'}</td>
                                <td>{item.episodeLink ? 'Yes' : '—'}</td>
                              </tr>
                            ))}
                            {uploadPreview.length > 5 && (
                              <tr>
                                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--dark-gray)', fontSize: '12px', padding: '8px' }}>
                                  + {uploadPreview.length - 5} more influencers
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className={styles.previewActions}>
                        <button 
                          type="button" 
                          onClick={() => {
                            setUploadPreview([]);
                            setUploadSuccess('');
                          }} 
                          className={styles.cancelImportBtn}
                        >
                          Clear
                        </button>
                        <button 
                          type="button" 
                          onClick={handleConfirmImport} 
                          className={styles.confirmImportBtn}
                        >
                          Import All {uploadPreview.length} Influencers
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
          {categoriesData.slice(0, 5).map(cat => {
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
                      <th>Status</th>
                      <th>Asset Link</th>
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
                          <td className={styles.statusCell}>
                            {item.engagementStatus || <span className={styles.dash}>—</span>}
                          </td>
                          <td className={styles.linkCell}>
                            {item.episodeLink ? (
                              <a 
                                href={item.episodeLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={styles.assetLinkBtn}
                              >
                                View Asset ↗
                              </a>
                            ) : (
                              <span className={styles.dash}>—</span>
                            )}
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
