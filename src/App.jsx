import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  Info,
  Leaf,
  RotateCcw,
  Ruler,
  Scale,
  Sparkles,
  Target,
  UserRound
} from 'lucide-react'
import {
  ACTIVITY_LEVELS,
  calculateBmr,
  calculateResults,
  getTargetWeights
} from './calculations'

const INITIAL_DATA = {
  sex: '',
  weight: '',
  height: '',
  age: '',
  activity: null,
  deficit: 300,
  targetWeight: 2
}

const STEPS = ['intro', 'sex', 'weight', 'height', 'age', 'activity', 'deficit', 'target', 'result']

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem('fitz-state'))
    return saved ? { ...INITIAL_DATA, ...saved.data } : INITIAL_DATA
  } catch {
    return INITIAL_DATA
  }
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value)
}

function Logo() {
  return (
    <div className="logo" aria-label="Fitz">
      <span className="logo-mark">F<span /></span>
      <span>fitz</span>
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

function App() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(readSavedState)

  useEffect(() => {
    localStorage.setItem('fitz-state', JSON.stringify({ data }))
  }, [data])

  const update = (key, value) => setData((current) => ({ ...current, [key]: value }))
  const targetWeights = useMemo(
    () => data.height ? getTargetWeights(Number(data.height)) : [],
    [data.height]
  )
  const results = useMemo(
    () => step === STEPS.length - 1 ? calculateResults({
      ...data,
      weight: Number(data.weight),
      height: Number(data.height),
      age: Number(data.age),
      deficit: Number(data.deficit)
    }) : null,
    [data, step]
  )

  const canContinue = () => {
    const current = STEPS[step]
    if (current === 'sex') return Boolean(data.sex)
    if (current === 'weight') return Number(data.weight) >= 30 && Number(data.weight) <= 300
    if (current === 'height') return Number(data.height) >= 120 && Number(data.height) <= 230
    if (current === 'age') return Number(data.age) >= 14 && Number(data.age) <= 100
    if (current === 'activity') return data.activity !== null
    if (current === 'deficit') {
      if (!data.weight || !data.height || !data.age || data.activity === null) return false
      const maintenance = calculateBmr({
        ...data,
        weight: Number(data.weight),
        height: Number(data.height),
        age: Number(data.age)
      }) * ACTIVITY_LEVELS[data.activity].factor
      const calories = maintenance - Number(data.deficit)
      const selectedTarget = targetWeights[data.targetWeight]?.weight ?? 0
      const minimumMacroCalories = selectedTarget * (data.sex === 'M' ? 2 : 1.6) * 4 + selectedTarget * 9
      return Number(data.deficit) >= 0 && Number(data.deficit) <= 1000 && calories > minimumMacroCalories
    }
    return true
  }

  const restart = () => {
    setData(INITIAL_DATA)
    setStep(0)
    localStorage.removeItem('fitz-state')
  }

  const renderStep = () => {
    switch (STEPS[step]) {
      case 'intro':
        return (
          <div className="hero">
            <div className="hero-copy">
              <p className="eyebrow"><Sparkles size={15} /> Nutrição feita para você</p>
              <h1>Seu corpo tem um ritmo.<br /><em>Vamos encontrá-lo.</em></h1>
              <p>Descubra suas necessidades calóricas e uma sugestão de macronutrientes em poucos passos, sem complicação.</p>
              <button className="button button-primary button-large" onClick={() => setStep(1)}>
                Começar agora <ArrowRight size={19} />
              </button>
              <div className="trust-row">
                <span><Check size={15} /> Leva 2 minutos</span>
                <span><Check size={15} /> Seus dados ficam neste dispositivo</span>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-card hero-card-main">
                <div className="mini-icon"><Flame size={25} /></div>
                <span>Seu plano diário</span>
                <strong>Personalizado</strong>
                <div className="macro-lines">
                  <i style={{ '--width': '82%', '--color': '#e8a23a' }} />
                  <i style={{ '--width': '62%', '--color': '#ef765c' }} />
                  <i style={{ '--width': '45%', '--color': '#2f7d68' }} />
                </div>
              </div>
              <div className="floating-pill pill-one"><HeartPulse size={17} /> Metabolismo</div>
              <div className="floating-pill pill-two"><Leaf size={17} /> Equilíbrio</div>
            </div>
          </div>
        )
      case 'sex':
        return (
          <StepLayout
            eyebrow="Sobre você"
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
        return <NumberStep icon={Scale} eyebrow="Seu perfil" title="Qual é o seu peso atual?" description="Use seu peso mais recente. Pequenas variações ao longo do dia são normais." value={data.weight} onChange={(value) => update('weight', value)} unit="kg" min={30} max={300} placeholder="70" />
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
                  <span className="radio">{data.activity === index && <span />}</span>
                </button>
              ))}
            </div>
          </StepLayout>
        )
      case 'deficit':
        return (
          <StepLayout eyebrow="Seu objetivo" title="Qual déficit calórico você deseja?" description="Déficit é a quantidade de calorias abaixo da manutenção. Uma abordagem moderada costuma ser mais sustentável.">
            <div className="deficit-card">
              <div className="deficit-value"><strong>{data.deficit}</strong><span>kcal / dia</span></div>
              <input
                className="range"
                type="range"
                min="0"
                max="1000"
                step="50"
                value={data.deficit}
                onChange={(event) => update('deficit', Number(event.target.value))}
                aria-label="Déficit calórico"
              />
              <div className="range-labels"><span>Manutenção</span><span>Agressivo</span></div>
              <div className="recommendation"><Info size={18} /><span><strong>Faixa moderada:</strong> 250 a 500 kcal por dia.</span></div>
            </div>
          </StepLayout>
        )
      case 'target':
        return (
          <StepLayout eyebrow="Composição corporal" title="Escolha uma referência de peso" description="Estas opções correspondem à faixa de IMC considerada saudável. Use como referência, não como diagnóstico.">
            <div className="target-list">
              {targetWeights.map((target, index) => (
                <button
                  key={target.bmi}
                  className={`target-option ${data.targetWeight === index ? 'selected' : ''}`}
                  onClick={() => update('targetWeight', index)}
                >
                  <span><Target size={21} /></span>
                  <strong>{formatNumber(target.weight, 1)} kg</strong>
                  <small>IMC {formatNumber(target.bmi, 1)}</small>
                  {index === 2 && <em>Equilíbrio</em>}
                  <i>{data.targetWeight === index && <Check size={15} />}</i>
                </button>
              ))}
            </div>
            <div className="context-note"><Info size={18} /> Seu peso atual é {formatNumber(Number(data.weight), 1)} kg. A meta escolhida serve apenas para calcular a sugestão de macros.</div>
          </StepLayout>
        )
      case 'result':
        return <Results results={results} data={data} restart={restart} />
      default:
        return null
    }
  }

  const isIntro = step === 0
  const isResult = step === STEPS.length - 1
  const progress = Math.max(0, ((step - 1) / (STEPS.length - 2)) * 100)

  return (
    <div className="app-shell">
      <header>
        <Logo />
        {!isIntro && !isResult && <span className="step-counter">Etapa {step} de {STEPS.length - 2}</span>}
        {isResult && <button className="text-button" onClick={restart}><RotateCcw size={16} /> Refazer</button>}
      </header>
      {!isIntro && !isResult && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}
      <main className={isResult ? 'results-main' : ''}>{renderStep()}</main>
      {!isIntro && !isResult && (
        <footer className="navigation">
          <button className="button button-secondary" onClick={() => setStep((current) => current - 1)}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <button className="button button-primary" disabled={!canContinue()} onClick={() => setStep((current) => current + 1)}>
            Continuar <ArrowRight size={18} />
          </button>
        </footer>
      )}
    </div>
  )
}

function Results({ results, data, restart }) {
  const gradient = `conic-gradient(${results.macros.map((macro, index) => {
    const before = results.macros.slice(0, index).reduce((sum, item) => sum + item.percentage, 0)
    return `${macro.color} ${before}% ${before + macro.percentage}%`
  }).join(', ')})`

  return (
    <div className="results">
      <div className="result-heading">
        <p className="eyebrow"><Check size={15} /> Plano calculado</p>
        <h1>Seu ponto de partida</h1>
        <p>Uma estimativa diária baseada no seu perfil e na rotina que você informou.</p>
      </div>

      <section className="calorie-banner">
        <div>
          <span>Meta calórica diária</span>
          <strong>{formatNumber(results.calories)}</strong>
          <small>quilocalorias por dia</small>
        </div>
        <div className="calorie-context">
          <span><Flame size={18} /> Metabolismo basal <strong>{formatNumber(results.bmr)} kcal</strong></span>
          <ChevronRight size={17} />
          <span><Activity size={18} /> Manutenção <strong>{formatNumber(results.maintenance)} kcal</strong></span>
          <ChevronRight size={17} />
          <span><Target size={18} /> Déficit <strong>−{formatNumber(data.deficit)} kcal</strong></span>
        </div>
      </section>

      <section className="results-grid">
        <div className="panel macro-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Distribuição diária</p><h2>Seus macronutrientes</h2></div>
            <span className="target-badge">Referência: {formatNumber(results.targetWeight, 1)} kg</span>
          </div>
          <div className="macro-content">
            <div className="donut" style={{ background: gradient }}>
              <div><strong>{formatNumber(results.calories)}</strong><span>kcal</span></div>
            </div>
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
          <p className="eyebrow">Como chegamos aqui</p>
          <h2>Seu resumo</h2>
          <div className="summary-list">
            <span><UserRound /><small>Perfil</small><strong>{data.sex === 'F' ? 'Feminino' : 'Masculino'}, {data.age} anos</strong></span>
            <span><Scale /><small>Medidas</small><strong>{data.weight} kg · {data.height} cm</strong></span>
            <span><Dumbbell /><small>Atividade</small><strong>{ACTIVITY_LEVELS[data.activity].label}</strong></span>
            <span><Target /><small>Referência</small><strong>IMC {formatNumber(results.targetBmi, 1)}</strong></span>
          </div>
        </aside>
      </section>

      <div className="health-note">
        <HeartPulse size={22} />
        <div><strong>Um número é só o começo.</strong><p>Estes valores são estimativas educacionais, não uma prescrição. Ajustes individuais devem considerar sua saúde, rotina e acompanhamento profissional.</p></div>
      </div>

      <button className="button button-secondary restart-button" onClick={restart}><RotateCcw size={17} /> Fazer novo cálculo</button>
    </div>
  )
}

export default App
