// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
const DEVICE_STATUS_LABELS = {
  compliant: '보안 기준 충족',
  noncompliant: '보안 기준 미충족',
  unknown: '확인 불가',
};

const SESSION_STATUS_LABELS = {
  active: '활성',
  expired: '만료',
  revoked: '철회됨',
  unknown: '확인 불가',
};

const MODE_LABELS = {
  demo: '예제 자료',
  disconnected: '연결 없음',
  unknown: '확인 불가',
};

function formatDeviceStatus(status) {
  const label = (typeof status === 'string' && Object.hasOwn(DEVICE_STATUS_LABELS, status))
    ? DEVICE_STATUS_LABELS[status]
    : '확인 불가';
  return status ? `${label}(${status})` : label;
}

function formatSessionStatus(status) {
  const label = (typeof status === 'string' && Object.hasOwn(SESSION_STATUS_LABELS, status))
    ? SESSION_STATUS_LABELS[status]
    : '확인 불가';
  return status ? `${label}(${status})` : label;
}

const DECISION_LABELS = Object.freeze({
  allow: '접근 허용(allow)',
  deny: '접근 거부(deny)',
  challenge: '추가 인증 또는 확인 필요(challenge)',
  unknown: '판정 확인 불가(unknown)',
});

function formatDecision(decision) {
  if (typeof decision === 'string' && Object.hasOwn(DECISION_LABELS, decision)) {
    return DECISION_LABELS[decision];
  }
  return '판정 확인 불가(unknown)';
}

function formatCheckedAt(value) {
  if (typeof value !== 'string' || !value) return '시각 정보 없음';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
}

const EVENT_KIND_LABELS = Object.freeze({
  access: '접속(access)',
  xdr: 'XDR 경보(xdr)',
});

function formatEventKind(kind) {
  if (typeof kind === 'string' && Object.hasOwn(EVENT_KIND_LABELS, kind)) {
    return EVENT_KIND_LABELS[kind];
  }
  return kind ? `${kind}(unknown)` : '확인 불가(unknown)';
}

const ACCESS_STATE_LABELS = Object.freeze({
  allowed: '허용됨(allowed)',
  denied: '거부됨(denied)',
  unknown: '확인 불가(unknown)',
});

function formatAccessState(status) {
  if (typeof status === 'string' && Object.hasOwn(ACCESS_STATE_LABELS, status)) {
    return ACCESS_STATE_LABELS[status];
  }
  return '확인 불가(unknown)';
}

export function createStudentView() {
  return {
    renderIdentity(input) {
      const root = document.createElement('div');
      root.className = 'student-identity-view';
      if (!input) {
        const empty = document.createElement('p');
        empty.className = 'state state-empty';
        empty.textContent = '확인 불가';
        root.appendChild(empty);
        return root;
      }
      const me = input.me || (input.status ? input : null);
      const devices = input.devices;
      const sessions = input.sessions;
      const checkedModes = new Set();
      for (const res of [me, devices, sessions]) {
        const m = res?.mode;
        if (m && MODE_LABELS[m] && !checkedModes.has(m)) {
          checkedModes.add(m);
          const modeBadge = document.createElement('span');
          modeBadge.className = 'tag tag-demo';
          modeBadge.textContent = MODE_LABELS[m];
          root.appendChild(modeBadge);
        }
      }
      if (!me || me.status === 'loading') {
        const loading = document.createElement('p');
        loading.className = 'state state-loading';
        loading.textContent = '불러오는 중';
        root.appendChild(loading);
      } else if (me.status === 'error') {
        const error = document.createElement('p');
        error.className = 'state state-error';
        const msg = me.error?.message || '서버에 연결하지 못했습니다.';
        error.textContent = '연결 실패: ' + msg;
        root.appendChild(error);
      } else if (me.status === 'ok') {
        const dl = document.createElement('dl');
        dl.className = 'identity';
        const userDt = document.createElement('dt'); userDt.textContent = '사용자';
        const userDd = document.createElement('dd');
        const user = me.data?.user;
        userDd.textContent = (user && (user.label || user.id)) || '확인 불가';
        dl.appendChild(userDt); dl.appendChild(userDd);
        const deviceDt = document.createElement('dt'); deviceDt.textContent = '기기';
        const deviceDd = document.createElement('dd');
        const device = me.data?.device;
        const deviceName = (device && (device.label || device.id)) || '확인 불가';
        deviceDd.textContent = `${deviceName} · ${formatDeviceStatus(device?.status)}`;
        dl.appendChild(deviceDt); dl.appendChild(deviceDd);
        const sessionDt = document.createElement('dt'); sessionDt.textContent = '세션';
        const sessionDd = document.createElement('dd');
        const session = me.data?.session;
        sessionDd.textContent = `${(session && session.id) || '확인 불가'} · ${formatSessionStatus(session?.status)}`;
        dl.appendChild(sessionDt); dl.appendChild(sessionDd);
        root.appendChild(dl);
      }
      if (devices && devices !== me) {
        if (devices.status === 'error') {
          const devErr = document.createElement('p'); devErr.className = 'state state-error';
          devErr.textContent = '기기 목록 연결 실패: ' + (devices.error?.message || '조회 실패'); root.appendChild(devErr);
        } else if (devices.status === 'loading' && me?.status === 'ok') {
          const devLoading = document.createElement('p'); devLoading.className = 'muted';
          devLoading.textContent = '기기 목록: 불러오는 중'; root.appendChild(devLoading);
        }
      }
      if (sessions && sessions !== me) {
        if (sessions.status === 'error') {
          const sessErr = document.createElement('p'); sessErr.className = 'state state-error';
          sessErr.textContent = '세션 목록 연결 실패: ' + (sessions.error?.message || '조회 실패'); root.appendChild(sessErr);
        } else if (sessions.status === 'loading' && me?.status === 'ok') {
          const sessLoading = document.createElement('p'); sessLoading.className = 'muted';
          sessLoading.textContent = '세션 목록: 불러오는 중'; root.appendChild(sessLoading);
        }
      }
      return root;
    },
    renderDecision(input) {
      const root = document.createElement('div'); root.className = 'student-decision-view';
      if (!input || input.status === 'idle') {
        const p = document.createElement('p'); p.className = 'state state-empty'; p.textContent = '앱을 골라 접속을 요청하세요.'; root.appendChild(p); return root;
      }
      if (input.status === 'loading') {
        const p = document.createElement('p'); p.className = 'state state-loading';
        p.textContent = `${input.appId ? `[${input.appId}] ` : ''}판정 확인 중…`; root.appendChild(p); return root;
      }
      if (input.status === 'error') {
        const p = document.createElement('p'); p.className = 'state state-error';
        p.textContent = `요청 실패: ${input.error?.message || '판정 요청에 실패했습니다.'}`; root.appendChild(p);
        const note = document.createElement('p'); note.className = 'muted';
        note.textContent = '요청 실패는 접근 거부(차단) 판정이 아닙니다. 접근이 허용되지 않았습니다.'; root.appendChild(note); return root;
      }
      if (input.status === 'ok') {
        const data = input.data || {};
        const appId = data.appId || input.appId || '알 수 없음';
        const rawDecision = (typeof data.decision === 'string' && Object.hasOwn(DECISION_LABELS, data.decision)) ? data.decision : 'unknown';
        const decisionText = formatDecision(rawDecision), reason = data.reason || '사유 정보 없음';
        const checkedAt = formatCheckedAt(data.checkedAt);
        if (input.mode && MODE_LABELS[input.mode]) {
          const modeBadge = document.createElement('span'); modeBadge.className = 'tag tag-demo'; modeBadge.textContent = MODE_LABELS[input.mode]; root.appendChild(modeBadge);
        }
        const decisionP = document.createElement('p');
        decisionP.className = `decision decision-${['allow', 'deny', 'challenge'].includes(rawDecision) ? rawDecision : 'unknown'}`;
        decisionP.textContent = `판정 결과: ${decisionText} · 대상 앱: ${appId}`; root.appendChild(decisionP);
        if (rawDecision === 'challenge' || rawDecision === 'unknown') {
          const note = document.createElement('p'); note.className = 'muted';
          note.textContent = rawDecision === 'challenge' ? '추가 확인이 필요합니다. 이 앱은 확인 절차를 대신 수행하지 않습니다.' : '판정을 확인할 수 없습니다. 접근이 허용되지 않았습니다.';
          root.appendChild(note);
        }
        const dl = document.createElement('dl'); dl.className = 'kv';
        for (const [label, value] of [['업무 앱', appId], ['접속 판정', decisionText], ['판정 이유', reason], ['판정 시각', checkedAt]]) {
          const dt = document.createElement('dt'); dt.textContent = label;
          const dd = document.createElement('dd'); dd.textContent = value; dl.appendChild(dt); dl.appendChild(dd);
        }
        root.appendChild(dl); return root;
      }
      return root;
    },
    renderEvents(input) {
      const root = document.createElement('div'); root.className = 'student-events-view';
      if (!input || input.status === 'loading') {
        const p = document.createElement('p'); p.className = 'state state-loading'; p.textContent = '기록을 불러오는 중…'; root.appendChild(p); return root;
      }
      if (input.status === 'error') {
        const p = document.createElement('p'); p.className = 'state state-error';
        const msg = input.error?.message || ''; p.textContent = msg ? `기록을 불러오지 못했습니다: ${msg}` : '기록을 불러오지 못했습니다'; root.appendChild(p); return root;
      }
      if (input.status === 'ok') {
        const rawData = Array.isArray(input.data) ? input.data : [];
        if (rawData.length === 0) {
          const p = document.createElement('p'); p.className = 'state state-empty'; p.textContent = '표시할 기록이 없습니다'; root.appendChild(p); return root;
        }
        if (input.mode && MODE_LABELS[input.mode]) {
          const modeBadge = document.createElement('span'); modeBadge.className = 'tag tag-demo'; modeBadge.textContent = MODE_LABELS[input.mode]; root.appendChild(modeBadge);
        }
        const sortedEvents = [...rawData].sort((a, b) => (b.at ? new Date(b.at).getTime() : 0) - (a.at ? new Date(a.at).getTime() : 0));
        const filterControls = document.createElement('div'); filterControls.className = 'event-filters row'; filterControls.style.marginBottom = '12px';
        const kinds = new Set(), appIds = new Set(), accessStates = new Set();
        for (const ev of sortedEvents) { if (ev.kind) kinds.add(ev.kind); if (ev.appId) appIds.add(ev.appId); if (ev.state?.access) accessStates.add(ev.state.access); }
        const makeFilter = (title, values, format) => {
          const label = document.createElement('label'); label.textContent = `${title}: `;
          const select = document.createElement('select'); select.setAttribute('aria-label', title);
          const all = document.createElement('option'); all.value = 'all'; all.textContent = '전체'; select.appendChild(all);
          for (const value of values) { const option = document.createElement('option'); option.value = value; option.textContent = format(value); select.appendChild(option); }
          label.appendChild(select); filterControls.appendChild(label); return select;
        };
        const kindSelect = makeFilter('기록 종류', kinds, formatEventKind);
        const appSelect = makeFilter('업무 앱', appIds, value => value);
        const accessSelect = makeFilter('접속 상태', accessStates, formatAccessState);
        kindSelect.value = 'all'; appSelect.value = 'all'; accessSelect.value = 'all'; root.appendChild(filterControls);
        const countP = document.createElement('p'); countP.className = 'muted'; root.appendChild(countP);
        const listUl = document.createElement('ul'); listUl.className = 'plain-list event-list'; root.appendChild(listUl);
        const detailContainer = document.createElement('div'); detailContainer.className = 'card event-detail-box'; detailContainer.style.display = 'none'; root.appendChild(detailContainer);
        let selectedDetailId = null;
        function updateDetail(event) {
          detailContainer.replaceChildren();
          if (!event || selectedDetailId !== event.id) { detailContainer.removeAttribute('data-student-event-detail'); detailContainer.style.display = 'none'; selectedDetailId = null; return; }
          detailContainer.setAttribute('data-student-event-detail', event.id); detailContainer.style.display = 'block';
          const h3 = document.createElement('h3'); h3.textContent = `[${event.id}] 상세 정보`; detailContainer.appendChild(h3);
          const dl = document.createElement('dl'); dl.className = 'kv';
          const add = (label, value) => { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; dl.appendChild(dt); dl.appendChild(dd); };
          add('사건 ID', event.id); add('업무 앱', event.appId || '확인 불가'); add('접속 상태', formatAccessState(event.state?.access));
          add('세션 상태', formatSessionStatus(event.state?.session)); add('기기 상태', formatDeviceStatus(event.state?.device));
          const dtEv = document.createElement('dt'); dtEv.textContent = '근거 (evidence)'; const ddEv = document.createElement('dd');
          if (Array.isArray(event.evidence) && event.evidence.length) { const ul = document.createElement('ul'); for (const item of event.evidence) { const li = document.createElement('li'); li.textContent = `[${item.id}] ${item.text}`; ul.appendChild(li); } ddEv.appendChild(ul); }
          else ddEv.textContent = '근거 없음'; dl.appendChild(dtEv); dl.appendChild(ddEv);
          const dtRules = document.createElement('dt'); dtRules.textContent = '규칙 (rules)'; const ddRules = document.createElement('dd');
          if (Array.isArray(event.rules) && event.rules.length) { const ul = document.createElement('ul'); for (const item of event.rules) { const li = document.createElement('li'); li.textContent = `[${item.id}] ${item.text}`; ul.appendChild(li); } ddRules.appendChild(ul); }
          else ddRules.textContent = '규칙 없음'; dl.appendChild(dtRules); dl.appendChild(ddRules);
          if (Array.isArray(event.supportedActions) && event.supportedActions.length) {
            const dt = document.createElement('dt'); dt.textContent = '조치 안내'; const dd = document.createElement('dd');
            for (const action of event.supportedActions) {
              const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); btn.textContent = `${action} 미지원`; dd.appendChild(btn);
              const note = document.createElement('span'); note.className = 'muted'; note.style.marginLeft = '8px'; note.textContent = '조치 실행 연결은 준비 중입니다. (아직 지원하지 않는 조치입니다)'; dd.appendChild(note);
            }
            dl.appendChild(dt); dl.appendChild(dd);
          }
          detailContainer.appendChild(dl);
        }
        function renderFilteredList() {
          const kindVal = kindSelect.value || 'all', appVal = appSelect.value || 'all', accVal = accessSelect.value || 'all';
          const filtered = sortedEvents.filter(ev => (kindVal === 'all' || ev.kind === kindVal) && (appVal === 'all' || ev.appId === appVal) && (accVal === 'all' || ev.state?.access === accVal));
          countP.textContent = `조회 결과: 전체 ${sortedEvents.length}건 중 ${filtered.length}건 표시`; listUl.replaceChildren();
          if (!filtered.length) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = '조건에 맞는 기록이 없습니다.'; listUl.appendChild(li); return; }
          for (const ev of filtered) {
            const li = document.createElement('li'); li.setAttribute('data-student-event-id', ev.id); li.className = 'event-item';
            li.style.flexDirection = 'column'; li.style.alignItems = 'flex-start'; li.style.gap = '4px';
            const head = document.createElement('div'); head.className = 'row'; head.style.width = '100%'; head.style.justifyContent = 'space-between'; head.style.alignItems = 'center';
            const summary = document.createElement('span'); summary.className = 'item-title'; summary.textContent = `[${ev.id}] ${ev.summary || '요약 없음'}`;
            const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.setAttribute('aria-label', `${ev.id} 상세`); button.textContent = `${ev.id} 상세`;
            button.addEventListener('click', () => { selectedDetailId = selectedDetailId === ev.id ? null : ev.id; updateDetail(ev); });
            head.appendChild(summary); head.appendChild(button); li.appendChild(head);
            const meta = document.createElement('p'); meta.className = 'muted'; meta.style.margin = '0';
            meta.textContent = `${formatEventKind(ev.kind)} · ${formatCheckedAt(ev.at)} · ${ev.appId ? `앱: ${ev.appId}` : '앱 확인 불가'}`; li.appendChild(meta); listUl.appendChild(li);
          }
        }
        kindSelect.addEventListener('change', renderFilteredList); appSelect.addEventListener('change', renderFilteredList); accessSelect.addEventListener('change', renderFilteredList);
        renderFilteredList(); return root;
      }
      return root;
    },
    renderStatus(input) {
      const root = document.createElement('div'); root.className = 'student-status-view';
      const { devices, sessions, notifications, diagnostics, mode } = input || {};
      const currentMode = mode || devices?.mode || sessions?.mode || diagnostics?.mode;
      if (currentMode && MODE_LABELS[currentMode]) { const badge = document.createElement('span'); badge.className = 'tag tag-demo'; badge.textContent = MODE_LABELS[currentMode]; root.appendChild(badge); }
      const devSection = document.createElement('section'); devSection.className = 'status-section'; devSection.style.marginBottom = '16px';
      const devTitle = document.createElement('h3'); devTitle.textContent = '내 기기 상태'; devSection.appendChild(devTitle);
      if (!devices || devices.status === 'loading') { const p = document.createElement('p'); p.className = 'state state-loading'; p.textContent = '기기 정보를 불러오는 중…'; devSection.appendChild(p); }
      else if (devices.status === 'error') {
        const p = document.createElement('p'); p.className = 'state state-error'; const msg = devices.error?.message || '연결에 실패했습니다.';
        const timeout = devices.error?.code === 'TIMEOUT' || (typeof devices.error?.message === 'string' && (devices.error.message.includes('시간') || devices.error.message.includes('초과') || devices.error.message.toLowerCase().includes('timeout')));
        p.textContent = `기기 정보를 불러오지 못했습니다: ${msg}${timeout ? ' (요청 시간 초과)' : ''}`; devSection.appendChild(p);
        const note = document.createElement('p'); note.className = 'muted'; note.textContent = '기기 연결 상태를 확인하세요. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. (자동으로 다시 요청하지 않습니다)'; devSection.appendChild(note);
      } else if (devices.status === 'ok') {
        const list = Array.isArray(devices.data) ? devices.data : [];
        if (!list.length) { const p = document.createElement('p'); p.className = 'state state-empty'; p.textContent = '등록된 기기가 없음'; devSection.appendChild(p); }
        else { const ul = document.createElement('ul'); ul.className = 'plain-list'; for (const d of list) { const li = document.createElement('li');
          const attention = d.status === 'compliant' ? '' : d.status === 'noncompliant' ? ' [주의: 점검 필요]' : ' [주의: 현재 상태 확인 불가]';
          li.textContent = `${d.label || (d.id ? `기기 ${d.id}` : '확인 불가')}${d.id ? ` (${d.id})` : ''} · ${formatDeviceStatus(d.status)}${attention}`; ul.appendChild(li); } devSection.appendChild(ul); }
      }
      root.appendChild(devSection);
      const sessSection = document.createElement('section'); sessSection.className = 'status-section'; sessSection.style.marginBottom = '16px';
      const sessTitle = document.createElement('h3'); sessTitle.textContent = '내 세션 상태'; sessSection.appendChild(sessTitle);
      const scopeNote = document.createElement('p'); scopeNote.className = 'muted'; scopeNote.textContent = '세션 조회는 현재 검증된 연결 한 개를 대상으로 하며 과거 세션 전체 목록이 아닙니다. (지금 연결 하나만 조회되며 지난 세션 목록이 아닙니다)'; sessSection.appendChild(scopeNote);
      if (!sessions || sessions.status === 'loading') { const p = document.createElement('p'); p.className = 'state state-loading'; p.textContent = '세션 정보를 불러오는 중…'; sessSection.appendChild(p); }
      else if (sessions.status === 'error') {
        const p = document.createElement('p'); p.className = 'state state-error'; const msg = sessions.error?.message || '연결에 실패했습니다.';
        const timeout = sessions.error?.code === 'TIMEOUT' || (typeof sessions.error?.message === 'string' && (sessions.error.message.includes('시간') || sessions.error.message.includes('초과') || sessions.error.message.toLowerCase().includes('timeout')));
        p.textContent = `세션 정보를 불러오지 못했습니다: ${msg}${timeout ? ' (요청 시간 초과)' : ''}`; sessSection.appendChild(p);
        const note = document.createElement('p'); note.className = 'muted'; note.textContent = '세션 연결 상태를 확인하세요. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. (자동으로 다시 요청하지 않습니다)'; sessSection.appendChild(note);
      } else if (sessions.status === 'ok') {
        const list = Array.isArray(sessions.data) ? sessions.data : [];
        if (!list.length) { const p = document.createElement('p'); p.className = 'state state-empty'; p.textContent = '현재 연결 없음'; sessSection.appendChild(p); }
        else { const ul = document.createElement('ul'); ul.className = 'plain-list'; for (const s of list) { const li = document.createElement('li');
          const attention = s.status === 'active' ? '' : s.status === 'unknown' ? ' [주의: 현재 상태 확인 불가]' : ' [주의: 만료 또는 철회됨]';
          li.textContent = `${s.id || '확인 불가'} · ${formatSessionStatus(s.status)}${attention}`; ul.appendChild(li); } sessSection.appendChild(ul); }
      }
      root.appendChild(sessSection);
      const notifSection = document.createElement('section'); notifSection.className = 'status-section'; notifSection.style.marginBottom = '16px';
      const notifTitle = document.createElement('h3'); notifTitle.textContent = '보안 알림'; notifSection.appendChild(notifTitle);
      const notifList = Array.isArray(notifications) ? notifications : [];
      if (!notifList.length) { const p = document.createElement('p'); p.className = 'state state-empty'; p.textContent = '주의할 알림이 없습니다.'; notifSection.appendChild(p); }
      else { const ul = document.createElement('ul'); ul.className = 'plain-list'; for (const n of notifList) { const li = document.createElement('li'); li.textContent = `[${n.resource || '확인 불가'}] ${n.code || '알림'}: ${n.message || ''}`; ul.appendChild(li); } notifSection.appendChild(ul);
        const note = document.createElement('p'); note.className = 'muted'; note.textContent = '알림이 지속되면 연결 상태를 확인하고, 상단 다시 불러오기 버튼을 눌러 상태를 갱신하세요.'; notifSection.appendChild(note); }
      root.appendChild(notifSection);
      const diagSection = document.createElement('section'); diagSection.className = 'status-section'; const diagTitle = document.createElement('h3'); diagTitle.textContent = '도움정보 (진단)'; diagSection.appendChild(diagTitle);
      if (!diagnostics || diagnostics.status === 'idle') { const p = document.createElement('p'); p.className = 'muted'; p.textContent = '진단 정보가 조회되지 않았습니다. 제공 화면의 "도움정보 불러오기" 버튼을 누르면 안전한 진단 결과가 전달됩니다.'; diagSection.appendChild(p); }
      else if (diagnostics.status === 'loading') { const p = document.createElement('p'); p.className = 'state state-loading'; p.textContent = '도움정보를 불러오는 중…'; diagSection.appendChild(p); }
      else if (diagnostics.status === 'error') { const p = document.createElement('p'); p.className = 'state state-error'; const msg = diagnostics.error?.message || '조회 실패'; p.textContent = `도움정보를 불러오지 못했습니다: ${msg}`; diagSection.appendChild(p);
        const note = document.createElement('p'); note.className = 'muted'; note.textContent = '다시 시도는 제공 화면의 "도움정보 불러오기" 버튼을 직접 누르세요. (자동으로 다시 요청하지 않습니다)'; diagSection.appendChild(note); }
      else if (diagnostics.status === 'ok') {
        const data = diagnostics.data || {}; const safeInfo = { requestId: data.requestId || '확인 불가', component: data.component || '확인 불가', version: data.version || '확인 불가', checkedAt: data.checkedAt || '확인 불가', 'engine.mode': data.engine?.mode || '확인 불가', 'engine.code': data.engine?.code || '확인 불가' };
        const dl = document.createElement('dl'); dl.className = 'kv';
        for (const [label, value] of [['requestId', safeInfo.requestId], ['component', safeInfo.component], ['version', safeInfo.version], ['checkedAt', safeInfo.checkedAt], ['engine.mode', safeInfo['engine.mode']], ['engine.code', safeInfo['engine.code']]]) { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; dl.appendChild(dt); dl.appendChild(dd); }
        diagSection.appendChild(dl); const notice = document.createElement('p'); notice.className = 'muted'; notice.textContent = '이 정보는 도움 요청에 쓰도록 복사하는 진단 정보입니다. (비밀번호나 인증 토큰은 포함되지 않습니다)'; diagSection.appendChild(notice);
        const copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.className = 'btn'; copyBtn.textContent = '도움정보 복사'; const copyStatus = document.createElement('span'); copyStatus.className = 'muted'; copyStatus.style.marginLeft = '8px';
        copyBtn.addEventListener('click', async () => { try { if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(JSON.stringify(safeInfo, null, 2)); copyStatus.textContent = '도움정보를 클립보드에 복사했습니다.'; } else copyStatus.textContent = '클립보드 API를 지원하지 않는 환경입니다.'; } catch { copyStatus.textContent = '복사에 실패했습니다.'; } });
        const row = document.createElement('div'); row.className = 'row'; row.style.alignItems = 'center'; row.appendChild(copyBtn); row.appendChild(copyStatus); diagSection.appendChild(row);
      }
      root.appendChild(diagSection); return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection(input) {
      const root = document.createElement('div');
      root.className = 'student-ai-connection-view';
      const appendText = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        root.appendChild(node);
        return node;
      };
      const safeError = (error) => {
        const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+)/i;
        const rawCode = error?.code;
        const codeIsSafe = typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(rawCode) && !secretPattern.test(rawCode);
        const code = codeIsSafe ? rawCode : '확인 불가';
        const rawMessage = error?.message;
        const messageIsSafe = typeof rawMessage === 'string' && rawMessage.trim().length > 0 && rawMessage.length <= 500
          && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(rawMessage) && !secretPattern.test(rawMessage);
        const message = messageIsSafe ? rawMessage : '안전한 오류 설명을 확인할 수 없습니다.';
        return { code, message, categoryCode: codeIsSafe ? rawCode : 'UNKNOWN_ERROR' };
      };

      if (!input || input.status === 'idle') {
        appendText('p', 'state state-empty', 'AI 연결 점검 전');
        appendText('p', 'muted', '설정값 존재는 이용 권한 확인이 아닙니다. 다시 점검하려면 제공 화면에서 사용자가 「현재 API 연결 점검」을 직접 누르세요.');
        return root;
      }
      if (input.status === 'loading') {
        appendText('p', 'state state-loading', 'AI 연결 점검 중');
        appendText('p', 'muted', '모델 목록을 확인하는 중입니다. 자동으로 다시 점검하지 않습니다.');
        return root;
      }
      if (input.status === 'error') {
        const failure = safeError(input.error);
        appendText('p', 'state state-error', `AI 연결 점검 실패 [${failure.code}]: ${failure.message}`);
        const code = failure.categoryCode;
        let guide;
        if (['ON_AI_PROVISIONING_PENDING', 'ON_AI_AUTHORIZATION_CHANGED', 'AI_REQUEST_UNVERIFIED', 'ENGINE_RESULT_UNVERIFIED', 'CONTRACT_MISMATCH', 'UNKNOWN_ERROR'].includes(code)) {
          guide = '권한 준비 중 또는 확인 불가입니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요. 학생의 잘못으로 표시하지 않습니다.';
        } else if (['WB_CLCO_AUTH_REQUIRED', 'AUTH_REQUIRED', 'AUTH_FAILED', 'UNAUTHENTICATED', 'WB_CLCO_INVALID_TOKEN'].includes(code)) {
          guide = '인증 실패입니다. 계정 연결을 다시 확인하고, 계속되면 담당자에게 확인을 요청하세요. 열쇠를 복사하거나 입력하지 마세요.';
        } else if (['WB_CLCO_ACCESS_BLOCKED', 'ACCESS_BLOCKED', 'ACCESS_DENIED', 'FORBIDDEN'].includes(code)) {
          guide = '접근이 제한됐습니다. 계정 연결을 확인하고 담당자에게 앱 권한 확인을 요청하세요.';
        } else if (['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED', 'BUDGET_EXHAUSTED', 'LIMIT_REACHED', 'QUOTA_EXCEEDED'].includes(code)) {
          guide = '반 사용량 또는 이용 한도에 도달했습니다. 담당자에게 확인을 요청하세요.';
        } else if (['WB_CLCO_SESSION_CLOSED', 'SESSION_CLOSED', 'OUTSIDE_SESSION'].includes(code)) {
          guide = '현재 허용된 이용 시간이 아닙니다. 이용 시간을 확인하세요.';
        } else if (['WB_CLCO_RATE_LIMITED', 'RATE_LIMITED', 'REQUEST_LIMITED', 'WB_CLCO_TIMEOUT', 'TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'WB_CLCO_NETWORK_ERROR', 'NETWORK_ERROR', 'WB_CLCO_SERVER_UNAVAILABLE'].includes(code)) {
          guide = '요청 제한, 시간 초과 또는 네트워크 오류입니다. 잠시 뒤 사용자가 직접 다시 점검하세요.';
        } else if (['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'].includes(code)) {
          guide = '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.';
        } else if (['ON_AI_MODEL_LIST_EMPTY', 'MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'].includes(code)) {
          guide = '쓸 수 있는 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.';
        } else {
          guide = '연결 점검 원인을 확인할 수 없습니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.';
        }
        appendText('p', 'muted', guide);
        appendText('p', 'muted', '자동으로 다시 점검하지 않습니다. 다시 점검하려면 제공 화면에서 사용자가 버튼을 직접 누르세요.');
        return root;
      }
      if (input.status === 'ok') {
        const data = input.data && typeof input.data === 'object' ? input.data : {};
        if (!['test', 'verified'].includes(data.audienceAuthorization) || input.explanationAccepted !== false) {
          appendText('p', 'state state-error', 'AI 연결 점검 결과의 승인 상태 또는 사건 설명 상태를 확인할 수 없습니다.');
          appendText('p', 'muted', '확인되지 않은 연결 점검이나 사건 설명을 성공으로 표시하지 않습니다.');
          return root;
        }
        const modeLabels = { connected: '연결됨', demo: '예제 자료(demo) · 실제 연결 아님', disconnected: '연결 없음', unknown: '확인 불가' };
        if (Object.hasOwn(modeLabels, input.mode)) appendText('p', 'tag', `실행 모드: ${modeLabels[input.mode]}`);
        const authLabel = data.audienceAuthorization === 'test' ? '시험 연결 점검(test)' : '앱 권한 확인 후 점검(verified)';
        appendText('p', 'item-title', `API 연결 점검 상태: ${authLabel}`);
        const dl = document.createElement('dl'); dl.className = 'kv';
        const rows = [
          ['모델 목록 수', Number.isInteger(data.modelCount) && data.modelCount >= 0 ? `${data.modelCount}개` : '확인 불가'],
          ['점검 시각', formatCheckedAt(input.checkedAt)],
          ['사건 설명 실행 상태', '미실행'],
        ];
        for (const [label, value] of rows) {
          const dt = document.createElement('dt'); dt.textContent = label;
          const dd = document.createElement('dd'); dd.textContent = value;
          dl.appendChild(dt); dl.appendChild(dd);
        }
        root.appendChild(dl);
        appendText('p', 'muted', '이 결과는 API 연결과 모델 목록 점검입니다. 보안 이벤트 설명은 아직 실행하지 않았으며, 모델 목록 조회만으로 사건 설명 성공을 뜻하지 않습니다. 사건 설명은 보안 기록에서 별도로 요청하고 확인하세요.');
        return root;
      }
      return root;
    },
    renderExplanation(input) {
      const root = document.createElement('div');
      root.className = 'student-explanation-view';
      const { event, explanation, checkedAt } = input || {};
      const appendText = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        root.appendChild(node);
        return node;
      };
      const safeError = (error) => {
        const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+)/i;
        const rawCode = error?.code;
        const code = typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(rawCode) && !secretPattern.test(rawCode) ? rawCode : '확인 불가';
        const rawMessage = error?.message;
        const message = typeof rawMessage === 'string' && rawMessage.trim().length > 0 && rawMessage.length <= 500
          && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(rawMessage) && !secretPattern.test(rawMessage)
          ? rawMessage : '안전한 오류 설명을 확인할 수 없습니다.';
        return { code, message };
      };
      const appendSafeCode = () => {
        const rawCode = explanation?.error?.code;
        if (typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(rawCode)
            && !/(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+)/i.test(rawCode)) {
          appendText('p', 'muted', `오류 코드: ${rawCode}`);
        }
      };
      const showUnusableExplanation = (reason) => {
        appendText('p', 'state state-error', reason);
        appendSafeCode();
      };

      // 실패는 선택된 기록 유무와 관계없이 먼저 알려 준다.
      if (explanation?.status === 'error') {
        const failure = safeError(explanation.error);
        appendText('p', 'state state-error', `AI 설명 실패 [${failure.code}]: ${failure.message}`);
        appendText('p', 'muted', '보안 기록은 그대로입니다.');
        return root;
      }
      if (explanation?.status === 'loading') {
        appendText('p', 'state state-loading', `${event?.id ? `사건 [${event.id}] ` : ''}AI 설명 요청 중`);
        return root;
      }
      if (!event) {
        appendText('p', 'state state-empty', '보안 기록에서 기록을 먼저 고르세요.');
        return root;
      }
      if (!explanation || explanation.status === 'idle') {
        appendText('p', 'state state-empty', '사건 설명 대기 중');
        appendText('p', 'muted', '보안 기록에서 사건을 선택해 AI 설명을 요청하세요.');
        return root;
      }
      if (explanation.status !== 'ok') {
        appendText('p', 'state state-error', 'AI 설명 상태를 확인할 수 없습니다.');
        return root;
      }

      const data = explanation.data;
      const eventId = event.id;
      if (typeof eventId !== 'string' || !eventId || !data || typeof data !== 'object') {
        showUnusableExplanation('기록 또는 설명 자료가 없어 AI 설명을 표시할 수 없습니다.');
        return root;
      }
      if (data.executed !== false) {
        showUnusableExplanation('AI가 이미 실행했다고 표시한 설명은 사용할 수 없습니다. 조치는 실행되지 않은 설명만 표시합니다.');
        return root;
      }
      if (data.requiresHumanConfirmation !== true) {
        showUnusableExplanation('사람 확인 필요 여부를 확인할 수 없어 AI 설명을 표시할 수 없습니다.');
        return root;
      }
      if (typeof data.summary !== 'string' || !Array.isArray(data.evidenceIds)
          || !Array.isArray(event.evidence) || !Array.isArray(event.rules)
          || !Array.isArray(event.supportedActions) || !Array.isArray(data.proposals)) {
        showUnusableExplanation('AI 설명 또는 선택한 기록의 자료 형식이 맞지 않아 표시할 수 없습니다.');
        return root;
      }
      if (event.evidence.length === 0 || data.evidenceIds.length === 0) {
        showUnusableExplanation('근거가 부족해 AI 설명을 표시할 수 없습니다. 근거가 없는 내용을 추정하지 않습니다.');
        return root;
      }
      const evidenceById = new Map();
      for (const item of event.evidence) {
        if (!item || typeof item.id !== 'string' || typeof item.text !== 'string' || evidenceById.has(item.id)) {
          showUnusableExplanation('선택한 기록의 근거 자료가 유효하지 않아 AI 설명을 표시할 수 없습니다.');
          return root;
        }
        evidenceById.set(item.id, item);
      }
      const evidenceIds = data.evidenceIds;
      const uniqueEvidenceIds = new Set(evidenceIds);
      if (evidenceIds.some(id => typeof id !== 'string' || !evidenceById.has(id))
          || uniqueEvidenceIds.size !== evidenceIds.length || evidenceIds.length !== evidenceById.size) {
        showUnusableExplanation('근거 ID가 선택한 기록의 근거와 일치하지 않아 AI 설명을 표시할 수 없습니다. 근거가 맞지 않으므로 내용을 지어내거나 보완하지 않습니다.');
        return root;
      }
      const proposalsValid = data.proposals.every(proposal => proposal && typeof proposal.action === 'string'
        && typeof proposal.reason === 'string' && Array.isArray(proposal.evidenceIds)
        && proposal.evidenceIds.length > 0
        && proposal.evidenceIds.every(id => typeof id === 'string' && evidenceById.has(id))
        && new Set(proposal.evidenceIds).size === proposal.evidenceIds.length
        && event.supportedActions.includes(proposal.action));
      if (!proposalsValid) {
        showUnusableExplanation('AI 제안의 근거 또는 지원 조치가 선택한 기록과 일치하지 않아 설명을 표시할 수 없습니다.');
        return root;
      }
      if (event.rules.some(rule => !rule || typeof rule.id !== 'string' || typeof rule.text !== 'string')) {
        showUnusableExplanation('선택한 기록의 규칙 자료가 유효하지 않아 AI 설명을 표시할 수 없습니다.');
        return root;
      }

      // 모든 연결 검증을 마친 성공 설명에만 성공 표식을 부여한다.
      root.setAttribute('data-student-explanation-event', eventId);
      appendText('p', 'item-title', `사건 ID: ${eventId}`);
      appendText('h3', '', 'AI 설명(참고용)');
      appendText('p', '', data.summary);
      appendText('p', 'muted', 'AI 설명은 해석을 위한 참고 정보입니다. 사실 판단은 근거 글과 연동 시스템이 알려 준 상태를 기준으로 합니다.');

      appendText('h3', '', '인용한 근거');
      const evidenceList = document.createElement('ul');
      evidenceList.className = 'plain-list';
      for (const id of evidenceIds) {
        const item = evidenceById.get(id);
        const li = document.createElement('li');
        li.textContent = `근거 ${id} — ${item.text}`;
        evidenceList.appendChild(li);
      }
      root.appendChild(evidenceList);

      appendText('h3', '', '기록의 규칙');
      if (event.rules.length === 0) {
        appendText('p', 'muted', '규칙 없음');
      } else {
        const rulesList = document.createElement('ul');
        rulesList.className = 'plain-list';
        for (const rule of event.rules) {
          const li = document.createElement('li');
          li.textContent = `규칙 ${rule.id} — ${rule.text}`;
          rulesList.appendChild(li);
        }
        root.appendChild(rulesList);
      }

      appendText('h3', '', '확인 불가 상태');
      const stateNames = { access: '접속', session: '세션', device: '기기' };
      const unknownStates = Object.entries(stateNames)
        .filter(([key]) => event.state?.[key] === 'unknown')
        .map(([key, label]) => `${label}: 확인 불가(unknown)`);
      appendText('p', 'muted', unknownStates.length ? unknownStates.join(' · ') : '없음');

      appendText('h3', '', 'AI 조치 제안');
      if (data.proposals.length === 0) {
        appendText('p', 'muted', event.supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 제안한 조치가 없습니다.');
      } else {
        const proposalList = document.createElement('ul');
        proposalList.className = 'plain-list';
        for (const proposal of data.proposals) {
          const li = document.createElement('li');
          li.textContent = `${proposal.action} — ${proposal.reason}. 사람 확인이 필요하며 아직 실행되지 않았습니다.`;
          proposalList.appendChild(li);
        }
        root.appendChild(proposalList);
      }
      appendText('p', 'muted', `설명 시각: ${formatCheckedAt(checkedAt)}`);
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
