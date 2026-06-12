import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  History,
  Info,
  Plus,
  RotateCcw,
  Ruler,
  Scale,
  Target,
  Trash2,
  UserRound,
  UsersRound
} from 'lucide-react'
import {
  ACTIVITY_LEVELS,
  calculateBmr,
  calculateResults,
  getTargetWeights
} from './calculations'
import {
  INITIAL_DATA,
  createProfile,
  createRecord,
  readStore,
  writeStore
} from './storage'

const STEPS = ['sex', 'weight', 'height', 'age', 'activity', 'deficit', 'target']

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value)
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}

function Logo() {
  return (
    <button className="logo logo-button" aria-label="Ir para perfis" type="button">
      <span className="logo-mark">F<span /></span>
      <span>fitz</span>
    </button>
  )
}

function StepLayout({ eyebrow, title, description, children }) {
  return (
    <div className="step-content">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p className="step-description">{description}</p>}
      <div className="step-body">{children}</div>
    </div>
  )
}

function NumberStep({ icon: Icon, eyebrow, title, description, value, onChange, unit, min, max, placeholder }) {
  const numericValue = Number(value)
  const valid = value !== '' && numericValue >= min && numericValue <= max

  return (
    <StepLayout eyebrow={eyebrow} title={title} description={description}>
      <div className={`number-field ${valid ? 'is-valid' : ''}`}>
        <Icon size={25} strokeWidth={1.8} />
        <input
          autoFocus
          inputMode="decimal"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={title}
        />
        <span className="number-unit">{unit}</span>
        {valid && <Check className="field-check" size={20} />}
      </div>
      <p className="field-hint">Informe um valor entre {min} e {max} {unit}.</p>
    </StepLayout>
  )
}

function App() {
  const [store, setStore] = useState(readStore)
  const [view, setView] = useState('home')
  const [step, setStep] = useState(0)
  const [data, setData] = useState(INITIAL_DATA)
  const [results, setResults] = useState(null)

  const activeProfile = store.profiles.find((profile) => profile.id === store.activeProfileId)

  useEffect(() => {
    writeStore(store)
  }, [store])

  const openHome = () => setView('home')

  const selectProfile = (profileId) => {
    setStore((current) => ({ ...current, activeProfileId: profileId }))
  }

  const startAssessment = (profile) => {
    selectProfile(profile.id)
    setData({ ...INITIAL_DATA, ...profile.data })
    setStep(0)
    setResults(null)
    setView('assessment')
  }

  const addProfile = (name) => {
    const profile = createProfile(name)
    setStore((current) => ({
      ...current,
      activeProfileId: profile.id,
      profiles: [...current.profiles, profile]
    }))
    return profile
  }

  const deleteProfile = (profile) => {
    if (!window.confirm(`Excluir o perfil de ${profile.name} e todo o histórico?`)) return
    setStore((current) => {
      const profiles = current.profiles.filter((item) => item.id !== profile.id)
      return {
        ...current,
        profiles,
        activeProfileId: current.activeProfileId === profile.id ? profiles[0]?.id ?? null : current.activeProfileId
      }
    })
  }

  const update = (key, value) => {
    setData((current) => ({ ...current, [key]: value }))
  }

  const saveDraft = (nextData) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => (
        profile.id === current.activeProfileId
          ? { ...profile, data: nextData }
          : profile
      ))
    }))
  }

  const targetWeights = useMemo(
    () => data.height ? getTargetWeights(Number(data.height)) : [],
    [data.height]
  )

  const canContinue = () => {
    const current = STEPS[step]
    if (current === 'sex') return Boolean(data.sex)
    if (current === 'weight') return Number(data.weight) >= 30 && Number(data.weight) <= 300
    if (current === 'height') return Number(data.height) >= 120 && Number(data.height) <= 230
    if (current === 'age') return Number(data.age) >= 14 && Number(data.age) <= 100
    if (current === 'activity') return data.activity !== null
    if (current === 'deficit') {
      const maintenance = calculateBmr({
        ...data,
        weight: Number(data.weight),
        height: Number(data.height),
        age: Number(data.age)
      }) * ACTIVITY_LEVELS[data.activity].factor
      const selectedTarget = targetWeights[data.targetWeight]?.weight ?? 0
      const minimumMacroCalories = selectedTarget * (data.sex === 'M' ? 2 : 1.6) * 4 + selectedTarget * 9
      return Number(data.deficit) >= 0 && Number(data.deficit) <= 1000 &&
        maintenance - Number(data.deficit) > minimumMacroCalories
    }
    return true
  }

  const continueAssessment = () => {
    saveDraft(data)
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1)
      return
    }

    const numericData = {
      ...data,
      weight: Number(data.weight),
      height: Number(data.height),
      age: Number(data.age),
      deficit: Number(data.deficit)
    }
    const nextResults = calculateResults(numericData)
    const record = createRecord(numericData, nextResults)

    setData(numericData)
    setResults(nextResults)
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => (
        profile.id === current.activeProfileId
          ? { ...profile, data: numericData, records: [...profile.records, record] }
          : profile
      ))
    }))
    setView('result')
  }

  const showHistory = (profileId = store.activeProfileId) => {
    if (profileId) selectProfile(profileId)
    setView('history')
  }

  const renderStep = () => {
    switch (STEPS[step]) {
      case 'sex':
        return (
          <StepLayout
            eyebrow={`Perfil de ${activeProfile?.name}`}
            title="Como seu corpo funciona?"
            description="O sexo biológico é usado na fórmula de Mifflin-St Jeor para estimar seu metabolismo basal."
          >
            <div className="choice-grid two-columns">
              {[
                { value: 'F', label: 'Feminino', caption: 'Fórmula para mulheres' },
                { value: 'M', label: 'Masculino', caption: 'Fórmula para homens' }
              ].map((option) => (
                <button
                  key={option.value}
                  className={`choice-card ${data.sex === option.value ? 'selected' : ''}`}
                  onClick={() => update('sex', option.value)}
                >
                  <UserRound size={30} strokeWidth={1.6} />
                  <strong>{option.label}</strong>
                  <span>{option.caption}</span>
                  <i>{data.sex === option.value && <Check size={16} />}</i>
                </button>
              ))}
            </div>
          </StepLayout>
        )
      case 'weight':
        return <NumberStep icon={Scale} eyebrow="Medidas atuais" title="Qual é o peso de hoje?" description="Cada nova avaliação gera um ponto no gráfico de evolução." value={data.weight} onChange={(value) => update('weight', value)} unit="kg" min={30} max={300} placeholder="70" />
      case 'height':
        return <NumberStep icon={Ruler} eyebrow="Seu perfil" title="Qual é a sua altura?" description="Informe sua altura sem calçados, em centímetros." value={data.height} onChange={(value) => update('height', value)} unit="cm" min={120} max={230} placeholder="170" />
      case 'age':
        return <NumberStep icon={UserRound} eyebrow="Seu perfil" title="Quantos anos você tem?" description="A idade ajuda a tornar a estimativa metabólica mais precisa." value={data.age} onChange={(value) => update('age', value)} unit="anos" min={14} max={100} placeholder="28" />
      case 'activity':
        return (
          <StepLayout eyebrow="Sua rotina" title="Como é sua semana de atividades?" description="Considere uma semana típica, não apenas os últimos dias.">
            <div className="activity-list">
              {ACTIVITY_LEVELS.map((level, index) => (
                <button
                  key={level.label}
                  className={`activity-option ${data.activity === index ? 'selected' : ''}`}
                  onClick={() => update('activity', index)}
                >
                  <span className="activity-icon">{index < 2 ? <Activity /> : <Dumbbell />}</span>
                  <span className="activity-copy"><strong>{level.label}</strong><small>{level.detail}</small></span>
                  <span className="frequency">{level.frequency}</span>
                </button>
              ))}
            </div>
          </StepLayout>
        )
      case 'deficit':
        return (
          <StepLayout eyebrow="Seu objetivo" title="Qual déficit calórico você deseja?" description="Uma abordagem moderada costuma ser mais sustentável.">
            <div className="deficit-card">
              <div className="deficit-value"><strong>{data.deficit}</strong><span>kcal / dia</span></div>
              <input className="range" type="range" min="0" max="1000" step="50" value={data.deficit} onChange={(event) => update('deficit', Number(event.target.value))} />
              <div className="range-labels"><span>Manutenção</span><span>Agressivo</span></div>
              <div className="recommendation"><Info size={18} /><span><strong>Faixa moderada:</strong> 250 a 500 kcal por dia.</span></div>
            </div>
          </StepLayout>
        )
      case 'target':
        return (
          <StepLayout eyebrow="Composição corporal" title="Escolha uma referência de peso" description="Use esta faixa de IMC apenas como referência, não como diagnóstico.">
            <div className="target-list">
              {targetWeights.map((target, index) => (
                <button key={target.bmi} className={`target-option ${data.targetWeight === index ? 'selected' : ''}`} onClick={() => update('targetWeight', index)}>
                  <span><Target size={21} /></span>
                  <strong>{formatNumber(target.weight, 1)} kg</strong>
                  <small>IMC {formatNumber(target.bmi, 1)}</small>
                  {index === 2 && <em>Equilíbrio</em>}
                  <i>{data.targetWeight === index && <Check size={15} />}</i>
                </button>
              ))}
            </div>
          </StepLayout>
        )
      default:
        return null
    }
  }

  const assessmentProgress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="app-shell">
      <header>
        <div onClick={openHome}><Logo /></div>
        <nav className="top-nav">
          {store.profiles.length > 0 && (
            <>
              <button className={view === 'home' ? 'active' : ''} onClick={openHome}><UsersRound size={16} /> Perfis</button>
              <button className={view === 'history' ? 'active' : ''} onClick={() => showHistory()}><History size={16} /> Histórico</button>
            </>
          )}
        </nav>
        {view === 'assessment' && <span className="step-counter">Etapa {step + 1} de {STEPS.length}</span>}
      </header>

      {view === 'assessment' && <div className="progress-track"><span style={{ width: `${assessmentProgress}%` }} /></div>}

      <main className={['result', 'history', 'home'].includes(view) ? 'results-main' : ''}>
        {view === 'home' && (
          <Profiles
            profiles={store.profiles}
            activeProfileId={store.activeProfileId}
            onAdd={addProfile}
            onSelect={selectProfile}
            onStart={startAssessment}
            onHistory={showHistory}
            onDelete={deleteProfile}
          />
        )}
        {view === 'assessment' && renderStep()}
        {view === 'result' && results && (
          <Results
            results={results}
            data={data}
            profile={activeProfile}
            onRestart={() => activeProfile && startAssessment(activeProfile)}
            onHistory={() => showHistory()}
          />
        )}
        {view === 'history' && (
          <HistoryView
            profiles={store.profiles}
            activeProfileId={store.activeProfileId}
            onSelect={selectProfile}
            onStart={(profile) => startAssessment(profile)}
          />
        )}
      </main>

      {view === 'assessment' && (
        <footer className="navigation">
          <button className="button button-secondary" onClick={() => step === 0 ? openHome() : setStep((current) => current - 1)}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <button className="button button-primary" disabled={!canContinue()} onClick={continueAssessment}>
            {step === STEPS.length - 1 ? 'Calcular e salvar' : 'Continuar'} <ArrowRight size={18} />
          </button>
        </footer>
      )}
    </div>
  )
}

function Profiles({ profiles, activeProfileId, onAdd, onSelect, onStart, onHistory, onDelete }) {
  const [name, setName] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    const profile = onAdd(name)
    setName('')
    onStart(profile)
  }

  return (
    <div className="profiles-page">
      <div className="page-heading">
        <p className="eyebrow"><UsersRound size={15} /> Pessoas e avaliações</p>
        <h1>{profiles.length ? 'Quem será avaliado hoje?' : 'Crie o primeiro perfil'}</h1>
        <p>Os dados e o histórico de cada pessoa ficam separados neste dispositivo.</p>
      </div>

      <form className="new-profile" onSubmit={submit}>
        <UserRound size={21} />
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength="40" placeholder="Nome da pessoa" aria-label="Nome da pessoa" />
        <button className="button button-primary" disabled={!name.trim()}><Plus size={18} /> Criar perfil</button>
      </form>

      <div className="profiles-grid">
        {profiles.map((profile) => {
          const latest = profile.records.at(-1)
          return (
            <article className={`profile-card ${profile.id === activeProfileId ? 'selected' : ''}`} key={profile.id} onClick={() => onSelect(profile.id)}>
              <div className="profile-avatar">{profile.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-title">
                <h2>{profile.name}</h2>
                <span>{profile.records.length} {profile.records.length === 1 ? 'avaliação' : 'avaliações'}</span>
              </div>
              {latest ? (
                <div className="profile-stats">
                  <span><small>Último peso</small><strong>{formatNumber(latest.weight, 1)} kg</strong></span>
                  <span><small>IMC</small><strong>{formatNumber(latest.bmi, 1)}</strong></span>
                  <span><small>TMB</small><strong>{formatNumber(latest.bmr)} kcal</strong></span>
                </div>
              ) : <p className="empty-profile">Nenhuma avaliação registrada.</p>}
              <div className="profile-actions">
                <button className="button button-primary" onClick={(event) => { event.stopPropagation(); onStart(profile) }}>
                  <Plus size={17} /> Nova avaliação
                </button>
                <button className="icon-button" title="Ver histórico" disabled={!latest} onClick={(event) => { event.stopPropagation(); onHistory(profile.id) }}><History size={18} /></button>
                <button className="icon-button danger" title="Excluir perfil" onClick={(event) => { event.stopPropagation(); onDelete(profile) }}><Trash2 size={18} /></button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function MetricChart({ title, unit, records, field, color }) {
  const values = records.map((record) => record[field])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = records.length === 1 ? 50 : 6 + (index / (records.length - 1)) * 88
    const y = 84 - ((value - min) / range) * 68
    return { x, y, value }
  })

  return (
    <section className="chart-card">
      <div className="chart-heading">
        <div><p className="eyebrow">Evolução</p><h2>{title}</h2></div>
        <strong>{formatNumber(values.at(-1), field === 'bmr' ? 0 : 1)} <small>{unit}</small></strong>
      </div>
      <svg className="line-chart" viewBox="0 0 100 100" role="img" aria-label={`Gráfico de ${title}`}>
        {[16, 50, 84].map((y) => <line key={y} x1="5" y1={y} x2="95" y2={y} className="chart-grid-line" />)}
        {points.length > 1 && <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point, index) => <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="3.2" fill={color}><title>{formatNumber(point.value, field === 'bmr' ? 0 : 1)} {unit}</title></circle>)}
      </svg>
      <div className="chart-range"><span>{formatDate(records[0].recordedAt)}</span><span>{formatDate(records.at(-1).recordedAt)}</span></div>
    </section>
  )
}

function HistoryView({ profiles, activeProfileId, onSelect, onStart }) {
  const profile = profiles.find((item) => item.id === activeProfileId) ?? profiles[0]
  const records = profile?.records ?? []

  if (!profile) return <Profiles profiles={[]} onAdd={() => {}} />

  return (
    <div className="history-page">
      <div className="history-toolbar">
        <div className="page-heading">
          <p className="eyebrow"><History size={15} /> Histórico individual</p>
          <h1>Evolução de {profile.name}</h1>
          <p>{records.length} {records.length === 1 ? 'avaliação registrada' : 'avaliações registradas'} neste dispositivo.</p>
        </div>
        <label className="profile-select">
          <span>Perfil</span>
          <select value={profile.id} onChange={(event) => onSelect(event.target.value)}>
            {profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>

      {records.length ? (
        <>
          <div className="charts-grid">
            <MetricChart title="Peso" unit="kg" records={records} field="weight" color="#ef765c" />
            <MetricChart title="IMC" unit="" records={records} field="bmi" color="#e8a23a" />
            <MetricChart title="TMB" unit="kcal" records={records} field="bmr" color="#2f7d68" />
          </div>
          <section className="records-panel">
            <div className="panel-heading"><div><p className="eyebrow">Registros</p><h2>Linha do tempo</h2></div></div>
            <div className="records-table">
              <div className="record-row record-header"><span>Data</span><span>Peso</span><span>IMC</span><span>TMB</span><span>Meta diária</span></div>
              {[...records].reverse().map((record) => (
                <div className="record-row" key={record.id}>
                  <span><CalendarDays size={15} /> {formatDate(record.recordedAt)}</span>
                  <strong>{formatNumber(record.weight, 1)} kg</strong>
                  <strong>{formatNumber(record.bmi, 1)}</strong>
                  <strong>{formatNumber(record.bmr)} kcal</strong>
                  <strong>{formatNumber(record.calories)} kcal</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-history">
          <History size={34} />
          <h2>Ainda não há dados para o gráfico</h2>
          <p>Conclua a primeira avaliação de {profile.name} para iniciar o histórico.</p>
        </div>
      )}
      <button className="button button-primary history-action" onClick={() => onStart(profile)}><Plus size={17} /> Nova avaliação</button>
    </div>
  )
}

function Results({ results, data, profile, onRestart, onHistory }) {
  const gradient = `conic-gradient(${results.macros.map((macro, index) => {
    const before = results.macros.slice(0, index).reduce((sum, item) => sum + item.percentage, 0)
    return `${macro.color} ${before}% ${before + macro.percentage}%`
  }).join(', ')})`

  return (
    <div className="results">
      <div className="result-heading">
        <p className="eyebrow"><Check size={15} /> Avaliação salva no histórico</p>
        <h1>Plano de {profile?.name}</h1>
        <p>Uma estimativa diária baseada no perfil e na rotina informada.</p>
      </div>
      <section className="calorie-banner">
        <div><span>Meta calórica diária</span><strong>{formatNumber(results.calories)}</strong><small>quilocalorias por dia</small></div>
        <div className="calorie-context">
          <span><Flame size={18} /> Metabolismo basal <strong>{formatNumber(results.bmr)} kcal</strong></span>
          <ChevronRight size={17} />
          <span><Activity size={18} /> Manutenção <strong>{formatNumber(results.maintenance)} kcal</strong></span>
          <ChevronRight size={17} />
          <span><Target size={18} /> Déficit <strong>-{formatNumber(data.deficit)} kcal</strong></span>
        </div>
      </section>
      <section className="results-grid">
        <div className="panel macro-panel">
          <div className="panel-heading"><div><p className="eyebrow">Distribuição diária</p><h2>Macronutrientes</h2></div><span className="target-badge">Referência: {formatNumber(results.targetWeight, 1)} kg</span></div>
          <div className="macro-content">
            <div className="donut" style={{ background: gradient }}><div><strong>{formatNumber(results.calories)}</strong><span>kcal</span></div></div>
            <div className="macro-list">
              {results.macros.map((macro) => (
                <div className="macro-row" key={macro.name}>
                  <i style={{ background: macro.color }} />
                  <span><strong>{macro.name}</strong><small>{formatNumber(macro.percentage, 1)}% das calorias</small></span>
                  <b>{formatNumber(macro.grams)} g</b>
                  <em>{formatNumber(macro.calories)} kcal</em>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="panel summary-panel">
          <p className="eyebrow">Resumo</p><h2>Dados atuais</h2>
          <div className="summary-list">
            <span><UserRound /><small>Perfil</small><strong>{data.sex === 'F' ? 'Feminino' : 'Masculino'}, {data.age} anos</strong></span>
            <span><Scale /><small>Medidas</small><strong>{data.weight} kg · {data.height} cm</strong></span>
            <span><Dumbbell /><small>Atividade</small><strong>{ACTIVITY_LEVELS[data.activity].label}</strong></span>
            <span><Target /><small>Referência</small><strong>IMC {formatNumber(results.targetBmi, 1)}</strong></span>
          </div>
        </aside>
      </section>
      <div className="health-note"><HeartPulse size={22} /><div><strong>Um número é só o começo.</strong><p>Estes valores são estimativas educacionais e não substituem acompanhamento profissional.</p></div></div>
      <div className="result-actions">
        <button className="button button-secondary" onClick={onRestart}><RotateCcw size={17} /> Nova avaliação</button>
        <button className="button button-primary" onClick={onHistory}><History size={17} /> Ver evolução</button>
      </div>
    </div>
  )
}

export default App
