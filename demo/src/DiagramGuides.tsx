import { Section, P, H3, Code, Steps, HowToTable, Kbd, inlineCode, KW, STR, CMT, FN, TY, OP } from './docs-primitives';

// ── Flowchart ────────────────────────────────────────────────────────────────
export function FlowchartGuide() {
  return (
    <Section id="flowchart-guide" title="Flowchart" badge="general purpose">
      <P>
        The default variant. Each node is a freestanding shape — rectangle, diamond, circle, or parallelogram —
        and you draw any edge between any two nodes. Reach for it when you want maximum freedom: branching
        decision trees, ETL pipelines, deployment flows, anything that doesn't fit a more structured pattern.
      </P>

      <H3>Build it programmatically</H3>
      <Code raw={`import { flowchart } from 'flowchart-sequence-designer';

const order = flowchart('Order Flow')
  .node('start',   'Place order',     { shape: 'circle' })
  .node('check',   'Payment valid?',  { shape: 'diamond' })
  .node('confirm', 'Send confirmation')
  .node('retry',   'Retry payment')
  .node('done',    'Done',            { shape: 'circle' })
  .edge('start',   'check')
  .edge('check',   'confirm', { label: 'yes' })
  .edge('check',   'retry',   { label: 'no', style: 'dashed' })
  .edge('retry',   'check')
  .edge('confirm', 'done');

order.toMermaid();        // string
order.toSVG();            // string
order.toJSON();           // string — round-trips into <DiagramEditor initialModel={...} />`}>
        {KW('import')} {'{ '}{FN('flowchart')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
        {KW('const')} order {OP('=')} {FN('flowchart')}({STR("'Order Flow'")}){'\n'}
        {'  .'}{FN('node')}({STR("'start'")},   {STR("'Place order'")},     {'{ shape: '}{STR("'circle'")}{' }'}){'\n'}
        {'  .'}{FN('node')}({STR("'check'")},   {STR("'Payment valid?'")},  {'{ shape: '}{STR("'diamond'")}{' }'}){'\n'}
        {'  .'}{FN('node')}({STR("'confirm'")}, {STR("'Send confirmation'")}){'\n'}
        {'  .'}{FN('node')}({STR("'retry'")},   {STR("'Retry payment'")}){'\n'}
        {'  .'}{FN('node')}({STR("'done'")},    {STR("'Done'")},            {'{ shape: '}{STR("'circle'")}{' }'}){'\n'}
        {'  .'}{FN('edge')}({STR("'start'")},   {STR("'check'")}){'\n'}
        {'  .'}{FN('edge')}({STR("'check'")},   {STR("'confirm'")}, {'{ label: '}{STR("'yes'")}{' }'}){'\n'}
        {'  .'}{FN('edge')}({STR("'check'")},   {STR("'retry'")},   {'{ label: '}{STR("'no'")}, style: {STR("'dashed'")}{' }'}){'\n'}
        {'  .'}{FN('edge')}({STR("'retry'")},   {STR("'check'")}){'\n'}
        {'  .'}{FN('edge')}({STR("'confirm'")}, {STR("'done'")}){';'}{'\n\n'}
        order.{FN('toMermaid')}();        {CMT('// string')}{'\n'}
        order.{FN('toSVG')}();            {CMT('// string')}{'\n'}
        order.{FN('toJSON')}();           {CMT('// round-trips into <DiagramEditor initialModel={...} />')}
      </Code>

      <H3>Use the interactive editor</H3>
      <P>
        Drop <code style={inlineCode}>{'<DiagramEditor variant="flowchart" />'}</code> anywhere. With no
        <code style={inlineCode}>initialModel</code> it boots a sample 6-node order flow so you have
        something to play with immediately.
      </P>
      <Steps items={[
        <>Click <strong>+ Node</strong> in the controls strip to add a node at the canvas center.</>,
        <>Hover a node, then drag the small circle that appears at its bottom edge to a target node — releases an edge.</>,
        <>Double-click a node to rename it; <Kbd>Enter</Kbd> commits, <Kbd>Esc</Kbd> cancels.</>,
        <>Right-click a node for the shape picker, color tint, or to clone/delete it. Right-click the canvas to insert a node at the cursor.</>,
        <>Drag empty canvas to pan, scroll-wheel (or pinch) to zoom, <Kbd>Ctrl+0</Kbd> to fit all nodes back in view.</>,
      ]} />

      <H3>Common operations</H3>
      <HowToTable rows={[
        ['Change a node shape', <>Right-click the node → <em>Shape</em> → pick rectangle / diamond / circle / parallelogram.</>],
        ['Label an edge', <>Double-click the edge label area (or the midpoint if it's unlabeled) and type. <Kbd>Enter</Kbd> to commit.</>],
        ['Make an edge dashed / dotted', <>Right-click the edge → <em>Style</em>.</>],
        ['Route an edge through a waypoint', <>Hover the edge, drag the handle that appears at its midpoint. Right-click → <em>Reset routing</em> to clear.</>],
        ['Group-move several nodes', <><Kbd>Shift</Kbd>+click each node (or <Kbd>Shift</Kbd>+drag a box on the canvas), then drag any selected node — the whole group follows.</>],
        ['Snap a node to a sibling', <>Just drag — the editor flashes dashed indigo guides when an edge or center aligns, and snaps within 4&nbsp;px.</>],
        ['Persist + reload a diagram', <>Wire <code style={inlineCode}>onChange</code> to localStorage / your backend, then pass the saved JSON back via <code style={inlineCode}>initialModel</code>. Variant is preserved.</>],
      ]} />
    </Section>
  );
}

// ── Question ─────────────────────────────────────────────────────────────────
export function QuestionGuide() {
  return (
    <Section id="question-guide" title="Question" badge="branching">
      <P>
        A specialized flowchart where every node is a multiple-choice question. Each answer becomes a lettered
        card with its own output port, so the diagram tells the reader at a glance which branch corresponds to
        which response. Reach for it when you're designing onboarding flows, decision trees, quizzes, or
        triage logic.
      </P>

      <H3>Build it programmatically</H3>
      <P>
        Internally a question is a regular <code style={inlineCode}>DiagramNode</code> with its answers
        stored in <code style={inlineCode}>metadata.answers</code>. Edges from that node carry a
        <code style={inlineCode}>label</code> matching one of the answer strings — that's how the editor
        knows which port the edge leaves from.
      </P>
      <Code raw={`import { Model, type DiagramModel } from 'flowchart-sequence-designer';

const m: DiagramModel = {
  type: 'flowchart',
  variant: 'question',
  nodes: [
    { id: 'q1', label: 'What is your role?',
      metadata: { answers: ['Engineer', 'Designer', 'PM'] } },
    { id: 'eng',  label: 'Engineering onboarding' },
    { id: 'des',  label: 'Design onboarding' },
    { id: 'pm',   label: 'PM onboarding' },
  ],
  edges: [
    { id: 'e1', from: 'q1', to: 'eng', label: 'Engineer' },
    { id: 'e2', from: 'q1', to: 'des', label: 'Designer' },
    { id: 'e3', from: 'q1', to: 'pm',  label: 'PM' },
  ],
};

// Render directly: <DiagramEditor variant="question" initialModel={m} />`}>
        {KW('import')} {'{ '}{FN('Model')}, {KW('type')} {TY('DiagramModel')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
        {KW('const')} m: {TY('DiagramModel')} {OP('=')} {'{'}{'\n'}
        {'  '}type: {STR("'flowchart'")},{'\n'}
        {'  '}variant: {STR("'question'")},{'\n'}
        {'  '}nodes: [{'\n'}
        {'    '}{'{ '}id: {STR("'q1'")}, label: {STR("'What is your role?'")},{'\n'}
        {'      '}metadata: {'{ '}answers: [{STR("'Engineer'")}, {STR("'Designer'")}, {STR("'PM'")}] {'}'} {'}'},{'\n'}
        {'    '}{'{ '}id: {STR("'eng'")},  label: {STR("'Engineering onboarding'")} {'}'},{'\n'}
        {'    '}{'{ '}id: {STR("'des'")},  label: {STR("'Design onboarding'")} {'}'},{'\n'}
        {'    '}{'{ '}id: {STR("'pm'")},   label: {STR("'PM onboarding'")} {'}'},{'\n'}
        {'  '}],{'\n'}
        {'  '}edges: [{'\n'}
        {'    '}{'{ '}id: {STR("'e1'")}, from: {STR("'q1'")}, to: {STR("'eng'")}, label: {STR("'Engineer'")} {'}'},{'\n'}
        {'    '}{'{ '}id: {STR("'e2'")}, from: {STR("'q1'")}, to: {STR("'des'")}, label: {STR("'Designer'")} {'}'},{'\n'}
        {'    '}{'{ '}id: {STR("'e3'")}, from: {STR("'q1'")}, to: {STR("'pm'")},  label: {STR("'PM'")} {'}'},{'\n'}
        {'  '}],{'\n'}
        {'}'};{'\n\n'}
        {CMT('// Render: <DiagramEditor variant="question" initialModel={m} />')}
      </Code>

      <H3>Use the interactive editor</H3>
      <Steps items={[
        <>Mount <code style={inlineCode}>{'<DiagramEditor variant="question" />'}</code> — preset is a role-picker with three branches.</>,
        <>Click <strong>+ Question</strong> in the controls strip to add a new question node.</>,
        <>Select the question and open the right-hand panel — under <em>Answers</em>, click <strong>Add Answer</strong>, type, then <Kbd>Enter</Kbd>. Each answer renders as a lettered card (A, B, C…).</>,
        <>Drag from any answer card's port (the small circle at its bottom) to a target node — that's the answer's branch.</>,
        <>An answer whose port is connected is highlighted amber; disconnected answers stay neutral so you can spot orphaned branches.</>,
      ]} />

      <H3>Common operations</H3>
      <HowToTable rows={[
        ['Add an answer', <>Select the question → side panel → <strong>+ Add Answer</strong>. Edit inline.</>],
        ['Reorder answers', <>Drag the answer rows up/down in the side panel.</>],
        ['Remove an answer', <>Side panel → click the × next to the row. Any edge labeled with that answer is dropped.</>],
        ['Re-aim an existing branch', <>Hover the existing edge, drag its endpoint to a different node. The answer label is preserved.</>],
        ['Mix question + plain nodes', <>Plain nodes still work in the question variant — the answer-port logic only applies to nodes that carry <code style={inlineCode}>metadata.answers</code>.</>],
        ['Export to Mermaid', <>Question metadata round-trips into Mermaid as a diamond node with edge labels matching the answer strings.</>],
      ]} />
    </Section>
  );
}

// ── Journey ──────────────────────────────────────────────────────────────────
export function JourneyGuide() {
  return (
    <Section id="journey-guide" title="Journey" badge="ordered steps">
      <P>
        A linear, numbered walkthrough. Every node gets an emerald step-number badge in its top-left corner,
        and the variant defaults to clean rectangles. Reach for it when the order matters and you want the
        reader to feel "do this, then this, then this" — onboarding flows, runbooks, multi-step processes.
      </P>

      <H3>Build it programmatically</H3>
      <P>
        Journey is a flowchart variant — render order in the <code style={inlineCode}>nodes</code> array
        becomes step order (1, 2, 3…). No special API; use <code style={inlineCode}>flowchart()</code> and
        set <code style={inlineCode}>variant: 'journey'</code> on the model.
      </P>
      <Code raw={`import { flowchart } from 'flowchart-sequence-designer';

const onboarding = flowchart('Onboarding')
  .node('s1', 'Sign up')
  .node('s2', 'Verify email')
  .node('s3', 'Pick a plan')
  .node('s4', 'Invite team')
  .node('s5', 'Done!')
  .edge('s1', 's2')
  .edge('s2', 's3')
  .edge('s3', 's4')
  .edge('s4', 's5');

const model = { ...onboarding.toJSON ? JSON.parse(onboarding.toJSON()) : onboarding,
  variant: 'journey' };

// Or build the model literal directly with variant: 'journey'.`}>
        {KW('import')} {'{ '}{FN('flowchart')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
        {KW('const')} onboarding {OP('=')} {FN('flowchart')}({STR("'Onboarding'")}){'\n'}
        {'  .'}{FN('node')}({STR("'s1'")}, {STR("'Sign up'")}){'\n'}
        {'  .'}{FN('node')}({STR("'s2'")}, {STR("'Verify email'")}){'\n'}
        {'  .'}{FN('node')}({STR("'s3'")}, {STR("'Pick a plan'")}){'\n'}
        {'  .'}{FN('node')}({STR("'s4'")}, {STR("'Invite team'")}){'\n'}
        {'  .'}{FN('node')}({STR("'s5'")}, {STR("'Done!'")}){'\n'}
        {'  .'}{FN('edge')}({STR("'s1'")}, {STR("'s2'")}){'\n'}
        {'  .'}{FN('edge')}({STR("'s2'")}, {STR("'s3'")}){'\n'}
        {'  .'}{FN('edge')}({STR("'s3'")}, {STR("'s4'")}){'\n'}
        {'  .'}{FN('edge')}({STR("'s4'")}, {STR("'s5'")}){';'}{'\n\n'}
        {CMT('// Pass the model to the editor with variant: \'journey\' set on the')}{'\n'}
        {CMT("// DiagramModel object (or the variant prop on <DiagramEditor />).")}
      </Code>

      <H3>Use the interactive editor</H3>
      <Steps items={[
        <>Mount <code style={inlineCode}>{'<DiagramEditor variant="journey" />'}</code> — preset is a 5-step onboarding.</>,
        <>Click <strong>+ Step</strong> in the controls strip to append a step. Steps auto-number from 1 in document order.</>,
        <>The step badge is purely visual; reordering nodes in the JSON / via the editor renumbers them automatically.</>,
        <>Use the canvas just like a flowchart — drag-to-connect, double-click to rename. Most users only need straight sequential edges.</>,
      ]} />

      <H3>Common operations</H3>
      <HowToTable rows={[
        ['Insert a step in the middle', <>Add the node, then re-route the surrounding edges by dragging their endpoints. The badge numbers update automatically based on the node order.</>],
        ['Rename a step', <>Double-click the label, type, <Kbd>Enter</Kbd>.</>],
        ['Branch a step', <>Just add another edge — journey is still a graph, so a step can have multiple successors. The numbering follows array order, not graph order.</>],
        ['Use journey + question together', <>Mix freely. The variant prop controls the rendering style (badges + step-row layout) — the underlying data is still <code style={inlineCode}>DiagramModel</code>.</>],
      ]} />
    </Section>
  );
}

// ── Sequence ─────────────────────────────────────────────────────────────────
export function SequenceGuide() {
  return (
    <Section id="sequence-guide" title="Sequence" badge="actors + messages">
      <P>
        A time-ordered conversation between actors. Each actor gets a vertical lifeline; each message is an
        arrow from one lifeline to another, stacked top-to-bottom. Reach for it whenever the
        <em>who-talks-to-whom-and-in-what-order</em> story matters more than the structure: API call flows,
        protocol handshakes, system interactions during an incident.
      </P>
      <P>
        Sequence diagrams use a dedicated <code style={inlineCode}>{'<SequenceEditor />'}</code> — the
        canvas layout is fundamentally different from the flowchart variants, so it gets its own component
        with its own state shape.
      </P>

      <H3>Build it programmatically</H3>
      <Code raw={`import { sequence } from 'flowchart-sequence-designer';

const login = sequence('Login Flow')
  .actor('User')
  .actor('App')
  .actor('Server')
  .message('User',   'App',    'tap login')
  .message('App',    'Server', 'POST /login')
  .message('Server', 'App',    '200 OK + token', { style: 'dashed' })
  .message('App',    'User',   'show dashboard');

login.toMermaid();
// → sequenceDiagram
//     participant User
//     participant App
//     participant Server
//     User->>App: tap login
//     App->>Server: POST /login
//     Server-->>App: 200 OK + token
//     App->>User: show dashboard`}>
        {KW('import')} {'{ '}{FN('sequence')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer'")};{'\n\n'}
        {KW('const')} login {OP('=')} {FN('sequence')}({STR("'Login Flow'")}){'\n'}
        {'  .'}{FN('actor')}({STR("'User'")}){'\n'}
        {'  .'}{FN('actor')}({STR("'App'")}){'\n'}
        {'  .'}{FN('actor')}({STR("'Server'")}){'\n'}
        {'  .'}{FN('message')}({STR("'User'")},   {STR("'App'")},    {STR("'tap login'")}){'\n'}
        {'  .'}{FN('message')}({STR("'App'")},    {STR("'Server'")}, {STR("'POST /login'")}){'\n'}
        {'  .'}{FN('message')}({STR("'Server'")}, {STR("'App'")},    {STR("'200 OK + token'")}, {'{ style: '}{STR("'dashed'")}{' }'}){'\n'}
        {'  .'}{FN('message')}({STR("'App'")},    {STR("'User'")},   {STR("'show dashboard'")}){';'}{'\n\n'}
        login.{FN('toMermaid')}();{'\n'}
        {CMT('// → sequenceDiagram')}{'\n'}
        {CMT('//     participant User; participant App; participant Server')}{'\n'}
        {CMT('//     User->>App: tap login; App->>Server: POST /login')}{'\n'}
        {CMT('//     Server-->>App: 200 OK + token; App->>User: show dashboard')}
      </Code>
      <P>
        <code style={inlineCode}>.actor()</code> is optional — any participant referenced in a
        <code style={inlineCode}>.message()</code> is auto-registered. Use it when you want to fix the
        left-to-right column order.
      </P>

      <H3>Use the interactive editor</H3>
      <Code raw={`import { SequenceEditor, presetSequenceModel } from 'flowchart-sequence-designer/ui';

<SequenceEditor
  initialModel={presetSequenceModel()}   // optional: start blank by omitting
  onChange={(m) => save(m)}
/>`}>
        {KW('import')} {'{ '}{FN('SequenceEditor')}, {FN('presetSequenceModel')}{' }'} {KW('from')} {STR("'flowchart-sequence-designer/ui'")};{'\n\n'}
        {OP('<')}{TY('SequenceEditor')}{'\n'}
        {'  '}initialModel{OP('=')}{'{'}{FN('presetSequenceModel')}(){'}'}   {CMT('// omit for a blank canvas')}{'\n'}
        {'  '}onChange{OP('=')}{'{'}(m) {OP('=>')} {FN('save')}(m){'}'}{'\n'}
        {OP('/>')}
      </Code>
      <Steps items={[
        <>Three actor columns and four sample messages render by default. The canvas is fully scrollable.</>,
        <>Click <strong>+ Actor</strong> to add a column, <strong>+ Message</strong> to append a row.</>,
        <>Drag a message row to reorder it. Self-messages (same actor for <em>from</em> and <em>to</em>) render as a small loop on the actor's lifeline.</>,
        <>Select a message and open the right-hand panel to edit from/to, body text, and arrow style (solid / dashed for async / open).</>,
      ]} />

      <H3>Common operations</H3>
      <HowToTable rows={[
        ['Add a participant', <>Toolbar → <strong>+ Actor</strong>. Type the name in the side panel.</>],
        ['Reorder actors', <>Drag the actor header left/right at the top of the canvas.</>],
        ['Send a self-message', <>In <strong>+ Message</strong>, set <em>from</em> and <em>to</em> to the same actor. Renders as a half-loop.</>],
        ['Async (dashed) arrow', <>Select the message → side panel → <em>Style</em> → <strong>dashed</strong>.</>],
        ['Export to PlantUML / Mermaid', <>Same toolbar exports as the flowchart editor. The exporters translate solid → sync (<code style={inlineCode}>{'->>'}</code>) and dashed → async response (<code style={inlineCode}>{'-->>'}</code>).</>],
        ['Move a sequence into a flowchart (or vice-versa)', <>You can't — the data shapes are different. Use the right editor for the job.</>],
      ]} />
    </Section>
  );
}
