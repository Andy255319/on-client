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

      // 1. 모드 안내 (demo, disconnected, unknown) - me, devices, sessions 각각 확인하여 표시
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

      // 2. me (사용자 계정, 현재 기기, 현재 세션) 상태 처리
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

        // 사용자
        const userDt = document.createElement('dt');
        userDt.textContent = '사용자';
        const userDd = document.createElement('dd');
        const user = me.data?.user;
        userDd.textContent = (user && (user.label || user.id)) || '확인 불가';
        dl.appendChild(userDt);
        dl.appendChild(userDd);

        // 기기
        const deviceDt = document.createElement('dt');
        deviceDt.textContent = '기기';
        const deviceDd = document.createElement('dd');
        const device = me.data?.device;
        const deviceName = (device && (device.label || device.id)) || '확인 불가';
        const deviceStatus = formatDeviceStatus(device?.status);
        deviceDd.textContent = `${deviceName} · ${deviceStatus}`;
        dl.appendChild(deviceDt);
        dl.appendChild(deviceDd);

        // 세션
        const sessionDt = document.createElement('dt');
        sessionDt.textContent = '세션';
        const sessionDd = document.createElement('dd');
        const session = me.data?.session;
        const sessionId = (session && session.id) || '확인 불가';
        const sessionStatus = formatSessionStatus(session?.status);
        sessionDd.textContent = `${sessionId} · ${sessionStatus}`;
        dl.appendChild(sessionDt);
        dl.appendChild(sessionDd);

        root.appendChild(dl);
      }

      // 3. devices 및 sessions 상태 처리 (loading / ok / error)
      if (devices && devices !== me) {
        if (devices.status === 'error') {
          const devErr = document.createElement('p');
          devErr.className = 'state state-error';
          devErr.textContent = '기기 목록 연결 실패: ' + (devices.error?.message || '조회 실패');
          root.appendChild(devErr);
        } else if (devices.status === 'loading' && me?.status === 'ok') {
          const devLoading = document.createElement('p');
          devLoading.className = 'muted';
          devLoading.textContent = '기기 목록: 불러오는 중';
          root.appendChild(devLoading);
        }
      }

      if (sessions && sessions !== me) {
        if (sessions.status === 'error') {
          const sessErr = document.createElement('p');
          sessErr.className = 'state state-error';
          sessErr.textContent = '세션 목록 연결 실패: ' + (sessions.error?.message || '조회 실패');
          root.appendChild(sessErr);
        } else if (sessions.status === 'loading' && me?.status === 'ok') {
          const sessLoading = document.createElement('p');
          sessLoading.className = 'muted';
          sessLoading.textContent = '세션 목록: 불러오는 중';
          root.appendChild(sessLoading);
        }
      }

      return root;
    },
    renderDecision(input) {
      const root = document.createElement('div');
      root.className = 'student-decision-view';

      // 1. 요청 전 (idle)
      if (!input || input.status === 'idle') {
        const p = document.createElement('p');
        p.className = 'state state-empty';
        p.textContent = '앱을 골라 접속을 요청하세요.';
        root.appendChild(p);
        return root;
      }

      // 2. 요청 중 (loading)
      if (input.status === 'loading') {
        const p = document.createElement('p');
        p.className = 'state state-loading';
        const appText = input.appId ? `[${input.appId}] ` : '';
        p.textContent = `${appText}판정 확인 중…`;
        root.appendChild(p);
        return root;
      }

      // 3. 요청 실패 (error) - 접근 거부(차단) 판정과 명확히 구분
      if (input.status === 'error') {
        const p = document.createElement('p');
        p.className = 'state state-error';
        const msg = input.error?.message || '판정 요청에 실패했습니다.';
        p.textContent = `요청 실패: ${msg}`;
        root.appendChild(p);

        const note = document.createElement('p');
        note.className = 'muted';
        note.textContent = '요청 실패는 접근 거부(차단) 판정이 아닙니다. 접근이 허용되지 않았습니다.';
        root.appendChild(note);
        return root;
      }

      // 4. 판정 수신 (ok)
      if (input.status === 'ok') {
        const data = input.data || {};
        const appId = data.appId || input.appId || '알 수 없음';
        const rawDecision = (typeof data.decision === 'string' && Object.hasOwn(DECISION_LABELS, data.decision))
          ? data.decision
          : 'unknown';
        const decisionText = formatDecision(rawDecision);
        const reason = data.reason || '사유 정보 없음';
        const checkedAt = formatCheckedAt(data.checkedAt);

        // 모드 배지 (demo, disconnected, unknown)
        if (input.mode && MODE_LABELS[input.mode]) {
          const modeBadge = document.createElement('span');
          modeBadge.className = 'tag tag-demo';
          modeBadge.textContent = MODE_LABELS[input.mode];
          root.appendChild(modeBadge);
        }

        // 판정 결과 배너/문구
        const decisionP = document.createElement('p');
        const decisionClass = ['allow', 'deny', 'challenge'].includes(rawDecision) ? rawDecision : 'unknown';
        decisionP.className = `decision decision-${decisionClass}`;
        decisionP.textContent = `판정 결과: ${decisionText} · 대상 앱: ${appId}`;
        root.appendChild(decisionP);

        // 추가 안내문: challenge 및 unknown
        if (rawDecision === 'challenge') {
          const challengeNote = document.createElement('p');
          challengeNote.className = 'muted';
          challengeNote.textContent = '추가 확인이 필요합니다. 이 앱은 확인 절차를 대신 수행하지 않습니다.';
          root.appendChild(challengeNote);
        } else if (decisionClass === 'unknown') {
          const unknownNote = document.createElement('p');
          unknownNote.className = 'muted';
          unknownNote.textContent = '판정을 확인할 수 없습니다. 접근이 허용되지 않았습니다.';
          root.appendChild(unknownNote);
        }

        // 판정 상세 정보 (dl.kv)
        const dl = document.createElement('dl');
        dl.className = 'kv';

        const dtApp = document.createElement('dt');
        dtApp.textContent = '업무 앱';
        const ddApp = document.createElement('dd');
        ddApp.textContent = appId;
        dl.appendChild(dtApp);
        dl.appendChild(ddApp);

        const dtDecision = document.createElement('dt');
        dtDecision.textContent = '접속 판정';
        const ddDecision = document.createElement('dd');
        ddDecision.textContent = decisionText;
        dl.appendChild(dtDecision);
        dl.appendChild(ddDecision);

        const dtReason = document.createElement('dt');
        dtReason.textContent = '판정 이유';
        const ddReason = document.createElement('dd');
        ddReason.textContent = reason;
        dl.appendChild(dtReason);
        dl.appendChild(ddReason);

        const dtTime = document.createElement('dt');
        dtTime.textContent = '판정 시각';
        const ddTime = document.createElement('dd');
        ddTime.textContent = checkedAt;
        dl.appendChild(dtTime);
        dl.appendChild(ddTime);

        root.appendChild(dl);
        return root;
      }

      return root;
    },
    renderEvents(input) {
      const root = document.createElement('div');
      root.className = 'student-events-view';

      // 1. 로딩 상태
      if (!input || input.status === 'loading') {
        const p = document.createElement('p');
        p.className = 'state state-loading';
        p.textContent = '기록을 불러오는 중…';
        root.appendChild(p);
        return root;
      }

      // 2. 오류 상태 - 실패와 빈 목록을 명확히 구분
      if (input.status === 'error') {
        const p = document.createElement('p');
        p.className = 'state state-error';
        const msg = input.error?.message || '';
        p.textContent = msg ? `기록을 불러오지 못했습니다: ${msg}` : '기록을 불러오지 못했습니다';
        root.appendChild(p);
        return root;
      }

      // 3. 정상 수신 상태 (ok)
      if (input.status === 'ok') {
        const rawData = Array.isArray(input.data) ? input.data : [];

        // 빈 목록 처리
        if (rawData.length === 0) {
          const p = document.createElement('p');
          p.className = 'state state-empty';
          p.textContent = '표시할 기록이 없습니다';
          root.appendChild(p);
          return root;
        }

        // 모드 배지 (demo, disconnected, unknown)
        if (input.mode && MODE_LABELS[input.mode]) {
          const modeBadge = document.createElement('span');
          modeBadge.className = 'tag tag-demo';
          modeBadge.textContent = MODE_LABELS[input.mode];
          root.appendChild(modeBadge);
        }

        // data 배열 복사 후 at 기준 최신순 정렬 (원본 변조 방지)
        const sortedEvents = [...rawData].sort((a, b) => {
          const timeA = a.at ? new Date(a.at).getTime() : 0;
          const timeB = b.at ? new Date(b.at).getTime() : 0;
          return timeB - timeA;
        });

        // 필터 영역 컨테이너
        const filterControls = document.createElement('div');
        filterControls.className = 'event-filters row';
        filterControls.style.marginBottom = '12px';

        // 필터 옵션 추출 (고유값 집합)
        const kinds = new Set();
        const appIds = new Set();
        const accessStates = new Set();
        for (const ev of sortedEvents) {
          if (ev.kind) kinds.add(ev.kind);
          if (ev.appId) appIds.add(ev.appId);
          if (ev.state && ev.state.access) accessStates.add(ev.state.access);
        }

        // (1) 기록 종류 필터
        const kindLabel = document.createElement('label');
        kindLabel.textContent = '기록 종류: ';
        const kindSelect = document.createElement('select');
        kindSelect.setAttribute('aria-label', '기록 종류');
        const optKindAll = document.createElement('option');
        optKindAll.value = 'all';
        optKindAll.textContent = '전체';
        kindSelect.appendChild(optKindAll);
        for (const k of kinds) {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = formatEventKind(k);
          kindSelect.appendChild(opt);
        }
        kindLabel.appendChild(kindSelect);
        filterControls.appendChild(kindLabel);

        // (2) 업무 앱 필터
        const appLabel = document.createElement('label');
        appLabel.textContent = ' 업무 앱: ';
        const appSelect = document.createElement('select');
        appSelect.setAttribute('aria-label', '업무 앱');
        const optAppAll = document.createElement('option');
        optAppAll.value = 'all';
        optAppAll.textContent = '전체';
        appSelect.appendChild(optAppAll);
        for (const ap of appIds) {
          const opt = document.createElement('option');
          opt.value = ap;
          opt.textContent = ap;
          appSelect.appendChild(opt);
        }
        appLabel.appendChild(appSelect);
        filterControls.appendChild(appLabel);

        // (3) 접속 상태 필터
        const accessLabel = document.createElement('label');
        accessLabel.textContent = ' 접속 상태: ';
        const accessSelect = document.createElement('select');
        accessSelect.setAttribute('aria-label', '접속 상태');
        const optAccAll = document.createElement('option');
        optAccAll.value = 'all';
        optAccAll.textContent = '전체';
        accessSelect.appendChild(optAccAll);
        for (const ac of accessStates) {
          const opt = document.createElement('option');
          opt.value = ac;
          opt.textContent = formatAccessState(ac);
          accessSelect.appendChild(opt);
        }
        accessLabel.appendChild(accessSelect);
        filterControls.appendChild(accessLabel);

        kindSelect.value = 'all';
        appSelect.value = 'all';
        accessSelect.value = 'all';

        root.appendChild(filterControls);

        // 건수 안내 문구
        const countP = document.createElement('p');
        countP.className = 'muted';
        root.appendChild(countP);

        // 목록 컨테이너
        const listUl = document.createElement('ul');
        listUl.className = 'plain-list event-list';
        root.appendChild(listUl);

        // 상세 컨테이너 (단일 선택 상세 영역)
        const detailContainer = document.createElement('div');
        detailContainer.className = 'card event-detail-box';
        detailContainer.style.display = 'none';
        root.appendChild(detailContainer);

        let selectedDetailId = null;

        function updateDetail(event) {
          detailContainer.replaceChildren();
          if (!event || selectedDetailId !== event.id) {
            detailContainer.removeAttribute('data-student-event-detail');
            detailContainer.style.display = 'none';
            selectedDetailId = null;
            return;
          }

          detailContainer.setAttribute('data-student-event-detail', event.id);
          detailContainer.style.display = 'block';

          const h3 = document.createElement('h3');
          h3.textContent = `[${event.id}] 상세 정보`;
          detailContainer.appendChild(h3);

          const dl = document.createElement('dl');
          dl.className = 'kv';

          // 사건 ID
          const dtId = document.createElement('dt');
          dtId.textContent = '사건 ID';
          const ddId = document.createElement('dd');
          ddId.textContent = event.id;
          dl.appendChild(dtId);
          dl.appendChild(ddId);

          // 업무 앱
          const dtApp = document.createElement('dt');
          dtApp.textContent = '업무 앱';
          const ddApp = document.createElement('dd');
          ddApp.textContent = event.appId || '확인 불가';
          dl.appendChild(dtApp);
          dl.appendChild(ddApp);

          // 접속 상태
          const dtAccess = document.createElement('dt');
          dtAccess.textContent = '접속 상태';
          const ddAccess = document.createElement('dd');
          ddAccess.textContent = formatAccessState(event.state?.access);
          dl.appendChild(dtAccess);
          dl.appendChild(ddAccess);

          // 세션 상태
          const dtSession = document.createElement('dt');
          dtSession.textContent = '세션 상태';
          const ddSession = document.createElement('dd');
          ddSession.textContent = formatSessionStatus(event.state?.session);
          dl.appendChild(dtSession);
          dl.appendChild(ddSession);

          // 기기 상태
          const dtDevice = document.createElement('dt');
          dtDevice.textContent = '기기 상태';
          const ddDevice = document.createElement('dd');
          ddDevice.textContent = formatDeviceStatus(event.state?.device);
          dl.appendChild(dtDevice);
          dl.appendChild(ddDevice);

          // 근거 (evidence)
          const dtEv = document.createElement('dt');
          dtEv.textContent = '근거 (evidence)';
          const ddEv = document.createElement('dd');
          if (Array.isArray(event.evidence) && event.evidence.length > 0) {
            const evUl = document.createElement('ul');
            for (const evItem of event.evidence) {
              const li = document.createElement('li');
              li.textContent = `[${evItem.id}] ${evItem.text}`;
              evUl.appendChild(li);
            }
            ddEv.appendChild(evUl);
          } else {
            ddEv.textContent = '근거 없음';
          }
          dl.appendChild(dtEv);
          dl.appendChild(ddEv);

          // 규칙 (rules)
          const dtRules = document.createElement('dt');
          dtRules.textContent = '규칙 (rules)';
          const ddRules = document.createElement('dd');
          if (Array.isArray(event.rules) && event.rules.length > 0) {
            const ruleUl = document.createElement('ul');
            for (const rItem of event.rules) {
              const li = document.createElement('li');
              li.textContent = `[${rItem.id}] ${rItem.text}`;
              ruleUl.appendChild(li);
            }
            ddRules.appendChild(ruleUl);
          } else {
            ddRules.textContent = '규칙 없음';
          }
          dl.appendChild(dtRules);
          dl.appendChild(ddRules);

          // 미지원 조치 (supportedActions) 안내
          if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
            const dtAct = document.createElement('dt');
            dtAct.textContent = '조치 안내';
            const ddAct = document.createElement('dd');

            for (const action of event.supportedActions) {
              const actBtn = document.createElement('button');
              actBtn.type = 'button';
              actBtn.className = 'btn';
              actBtn.disabled = true;
              actBtn.setAttribute('aria-disabled', 'true');
              actBtn.textContent = `${action} 미지원`;
              ddAct.appendChild(actBtn);

              const actNote = document.createElement('span');
              actNote.className = 'muted';
              actNote.style.marginLeft = '8px';
              actNote.textContent = '조치 실행 연결은 준비 중입니다. (아직 지원하지 않는 조치입니다)';
              ddAct.appendChild(actNote);
            }

            dl.appendChild(dtAct);
            dl.appendChild(ddAct);
          }

          detailContainer.appendChild(dl);
        }

        function renderFilteredList() {
          const kindVal = kindSelect.value || 'all';
          const appVal = appSelect.value || 'all';
          const accVal = accessSelect.value || 'all';

          const filtered = sortedEvents.filter(ev => {
            if (kindVal !== 'all' && ev.kind !== kindVal) return false;
            if (appVal !== 'all' && ev.appId !== appVal) return false;
            if (accVal !== 'all' && ev.state?.access !== accVal) return false;
            return true;
          });

          countP.textContent = `조회 결과: 전체 ${sortedEvents.length}건 중 ${filtered.length}건 표시`;
          listUl.replaceChildren();

          if (filtered.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'muted';
            emptyLi.textContent = '조건에 맞는 기록이 없습니다.';
            listUl.appendChild(emptyLi);
            return;
          }

          for (const ev of filtered) {
            const li = document.createElement('li');
            li.setAttribute('data-student-event-id', ev.id);
            li.className = 'event-item';
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';
            li.style.gap = '4px';

            const headRow = document.createElement('div');
            headRow.className = 'row';
            headRow.style.width = '100%';
            headRow.style.justifyContent = 'space-between';
            headRow.style.alignItems = 'center';

            const summarySpan = document.createElement('span');
            summarySpan.className = 'item-title';
            summarySpan.textContent = `[${ev.id}] ${ev.summary || '요약 없음'}`;

            const detailBtn = document.createElement('button');
            detailBtn.type = 'button';
            detailBtn.className = 'btn';
            detailBtn.setAttribute('aria-label', `${ev.id} 상세`);
            detailBtn.textContent = `${ev.id} 상세`;
            detailBtn.addEventListener('click', () => {
              if (selectedDetailId === ev.id) {
                selectedDetailId = null;
              } else {
                selectedDetailId = ev.id;
              }
              updateDetail(ev);
            });

            headRow.appendChild(summarySpan);
            headRow.appendChild(detailBtn);
            li.appendChild(headRow);

            const metaP = document.createElement('p');
            metaP.className = 'muted';
            metaP.style.margin = '0';
            const kindText = formatEventKind(ev.kind);
            const timeText = formatCheckedAt(ev.at);
            const appText = ev.appId ? `앱: ${ev.appId}` : '앱 확인 불가';
            metaP.textContent = `${kindText} · ${timeText} · ${appText}`;
            li.appendChild(metaP);

            listUl.appendChild(li);
          }
        }

        kindSelect.addEventListener('change', renderFilteredList);
        appSelect.addEventListener('change', renderFilteredList);
        accessSelect.addEventListener('change', renderFilteredList);

        renderFilteredList();
        return root;
      }

      return root;
    },
    renderStatus(input) {
      const root = document.createElement('div');
      root.className = 'student-status-view';

      const { devices, sessions, notifications, diagnostics, mode } = input || {};

      // 0. 모드 안내 (demo, disconnected, unknown)
      const currentMode = mode || devices?.mode || sessions?.mode || diagnostics?.mode;
      if (currentMode && MODE_LABELS[currentMode]) {
        const modeBadge = document.createElement('span');
        modeBadge.className = 'tag tag-demo';
        modeBadge.textContent = MODE_LABELS[currentMode];
        root.appendChild(modeBadge);
      }

      // 1. 내 기기 (devices)
      const devSection = document.createElement('section');
      devSection.className = 'status-section';
      devSection.style.marginBottom = '16px';
      const devTitle = document.createElement('h3');
      devTitle.textContent = '내 기기 상태';
      devSection.appendChild(devTitle);

      if (!devices || devices.status === 'loading') {
        const p = document.createElement('p');
        p.className = 'state state-loading';
        p.textContent = '기기 정보를 불러오는 중…';
        devSection.appendChild(p);
      } else if (devices.status === 'error') {
        const isTimeout = devices.error?.code === 'TIMEOUT' || (typeof devices.error?.message === 'string' && (devices.error.message.includes('시간') || devices.error.message.includes('초과') || devices.error.message.toLowerCase().includes('timeout')));
        const errP = document.createElement('p');
        errP.className = 'state state-error';
        const timeoutText = isTimeout ? ' (요청 시간 초과)' : '';
        const msg = devices.error?.message || '연결에 실패했습니다.';
        errP.textContent = `기기 정보를 불러오지 못했습니다: ${msg}${timeoutText}`;
        devSection.appendChild(errP);

        const retryNote = document.createElement('p');
        retryNote.className = 'muted';
        retryNote.textContent = '기기 연결 상태를 확인하세요. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. (자동으로 다시 요청하지 않습니다)';
        devSection.appendChild(retryNote);
      } else if (devices.status === 'ok') {
        const list = Array.isArray(devices.data) ? devices.data : [];
        if (list.length === 0) {
          const emptyP = document.createElement('p');
          emptyP.className = 'state state-empty';
          emptyP.textContent = '등록된 기기가 없음';
          devSection.appendChild(emptyP);
        } else {
          const ul = document.createElement('ul');
          ul.className = 'plain-list';
          for (const d of list) {
            const li = document.createElement('li');
            const devLabel = d.label || (d.id ? `기기 ${d.id}` : '확인 불가');
            const devId = d.id ? ` (${d.id})` : '';
            const statusText = formatDeviceStatus(d.status);
            let attention = '';
            if (d.status === 'compliant') {
              attention = '';
            } else if (d.status === 'noncompliant') {
              attention = ' [주의: 점검 필요]';
            } else if (d.status === 'unknown') {
              attention = ' [주의: 현재 상태 확인 불가]';
            } else {
              attention = ' [주의: 현재 상태 확인 불가]';
            }
            li.textContent = `${devLabel}${devId} · ${statusText}${attention}`;
            ul.appendChild(li);
          }
          devSection.appendChild(ul);
        }
      }
      root.appendChild(devSection);

      // 2. 내 세션 (sessions)
      const sessSection = document.createElement('section');
      sessSection.className = 'status-section';
      sessSection.style.marginBottom = '16px';
      const sessTitle = document.createElement('h3');
      sessTitle.textContent = '내 세션 상태';
      sessSection.appendChild(sessTitle);

      const sessScopeNote = document.createElement('p');
      sessScopeNote.className = 'muted';
      sessScopeNote.textContent = '세션 조회는 현재 검증된 연결 한 개를 대상으로 하며 과거 세션 전체 목록이 아닙니다. (지금 연결 하나만 조회되며 지난 세션 목록이 아닙니다)';
      sessSection.appendChild(sessScopeNote);

      if (!sessions || sessions.status === 'loading') {
        const p = document.createElement('p');
        p.className = 'state state-loading';
        p.textContent = '세션 정보를 불러오는 중…';
        sessSection.appendChild(p);
      } else if (sessions.status === 'error') {
        const isTimeout = sessions.error?.code === 'TIMEOUT' || (typeof sessions.error?.message === 'string' && (sessions.error.message.includes('시간') || sessions.error.message.includes('초과') || sessions.error.message.toLowerCase().includes('timeout')));
        const errP = document.createElement('p');
        errP.className = 'state state-error';
        const timeoutText = isTimeout ? ' (요청 시간 초과)' : '';
        const msg = sessions.error?.message || '연결에 실패했습니다.';
        errP.textContent = `세션 정보를 불러오지 못했습니다: ${msg}${timeoutText}`;
        sessSection.appendChild(errP);

        const retryNote = document.createElement('p');
        retryNote.className = 'muted';
        retryNote.textContent = '세션 연결 상태를 확인하세요. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. (자동으로 다시 요청하지 않습니다)';
        sessSection.appendChild(retryNote);
      } else if (sessions.status === 'ok') {
        const list = Array.isArray(sessions.data) ? sessions.data : [];
        if (list.length === 0) {
          const emptyP = document.createElement('p');
          emptyP.className = 'state state-empty';
          emptyP.textContent = '현재 연결 없음';
          sessSection.appendChild(emptyP);
        } else {
          const ul = document.createElement('ul');
          ul.className = 'plain-list';
          for (const s of list) {
            const li = document.createElement('li');
            const statusText = formatSessionStatus(s.status);
            let attention = '';
            if (s.status === 'active') {
              attention = '';
            } else if (s.status === 'expired' || s.status === 'revoked') {
              attention = ' [주의: 만료 또는 철회됨]';
            } else if (s.status === 'unknown') {
              attention = ' [주의: 현재 상태 확인 불가]';
            } else {
              attention = ' [주의: 현재 상태 확인 불가]';
            }
            li.textContent = `${s.id || '확인 불가'} · ${statusText}${attention}`;
            ul.appendChild(li);
          }
          sessSection.appendChild(ul);
        }
      }
      root.appendChild(sessSection);

      // 3. 알림 (notifications)
      const notifSection = document.createElement('section');
      notifSection.className = 'status-section';
      notifSection.style.marginBottom = '16px';
      const notifTitle = document.createElement('h3');
      notifTitle.textContent = '보안 알림';
      notifSection.appendChild(notifTitle);

      const notifList = Array.isArray(notifications) ? notifications : [];
      if (notifList.length === 0) {
        const p = document.createElement('p');
        p.className = 'state state-empty';
        p.textContent = '주의할 알림이 없습니다.';
        notifSection.appendChild(p);
      } else {
        const ul = document.createElement('ul');
        ul.className = 'plain-list';
        for (const n of notifList) {
          const li = document.createElement('li');
          const res = n.resource || '확인 불가';
          const code = n.code || '알림';
          const msg = n.message || '';
          li.textContent = `[${res}] ${code}: ${msg}`;
          ul.appendChild(li);
        }
        notifSection.appendChild(ul);

        const notifHelp = document.createElement('p');
        notifHelp.className = 'muted';
        notifHelp.textContent = '알림이 지속되면 연결 상태를 확인하고, 상단 다시 불러오기 버튼을 눌러 상태를 갱신하세요.';
        notifSection.appendChild(notifHelp);
      }
      root.appendChild(notifSection);

      // 4. 도움정보 및 진단 (diagnostics)
      const diagSection = document.createElement('section');
      diagSection.className = 'status-section';
      const diagTitle = document.createElement('h3');
      diagTitle.textContent = '도움정보 (진단)';
      diagSection.appendChild(diagTitle);

      if (!diagnostics || diagnostics.status === 'idle') {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = '진단 정보가 조회되지 않았습니다. 제공 화면의 "도움정보 불러오기" 버튼을 누르면 안전한 진단 결과가 전달됩니다.';
        diagSection.appendChild(p);
      } else if (diagnostics.status === 'loading') {
        const p = document.createElement('p');
        p.className = 'state state-loading';
        p.textContent = '도움정보를 불러오는 중…';
        diagSection.appendChild(p);
      } else if (diagnostics.status === 'error') {
        const isTimeout = diagnostics.error?.code === 'TIMEOUT' || (typeof diagnostics.error?.message === 'string' && (diagnostics.error.message.includes('시간') || diagnostics.error.message.includes('초과') || diagnostics.error.message.toLowerCase().includes('timeout')));
        const p = document.createElement('p');
        p.className = 'state state-error';
        const timeoutText = isTimeout ? ' (요청 시간 초과)' : '';
        const msg = diagnostics.error?.message || '조회 실패';
        p.textContent = `도움정보를 불러오지 못했습니다: ${msg}${timeoutText}`;
        diagSection.appendChild(p);

        const retryNote = document.createElement('p');
        retryNote.className = 'muted';
        retryNote.textContent = '다시 시도는 제공 화면의 "도움정보 불러오기" 버튼을 직접 누르세요. (자동으로 다시 요청하지 않습니다)';
        diagSection.appendChild(retryNote);
      } else if (diagnostics.status === 'ok') {
        const data = diagnostics.data || {};
        const safeInfo = {
          requestId: data.requestId || '확인 불가',
          component: data.component || '확인 불가',
          version: data.version || '확인 불가',
          checkedAt: data.checkedAt || '확인 불가',
          'engine.mode': data.engine?.mode || '확인 불가',
          'engine.code': data.engine?.code || '확인 불가',
        };

        const dl = document.createElement('dl');
        dl.className = 'kv';

        const dtReq = document.createElement('dt');
        dtReq.textContent = 'requestId';
        const ddReq = document.createElement('dd');
        ddReq.textContent = safeInfo.requestId;
        dl.appendChild(dtReq);
        dl.appendChild(ddReq);

        const dtComp = document.createElement('dt');
        dtComp.textContent = 'component';
        const ddComp = document.createElement('dd');
        ddComp.textContent = safeInfo.component;
        dl.appendChild(dtComp);
        dl.appendChild(ddComp);

        const dtVer = document.createElement('dt');
        dtVer.textContent = 'version';
        const ddVer = document.createElement('dd');
        ddVer.textContent = safeInfo.version;
        dl.appendChild(dtVer);
        dl.appendChild(ddVer);

        const dtTime = document.createElement('dt');
        dtTime.textContent = 'checkedAt';
        const ddTime = document.createElement('dd');
        ddTime.textContent = safeInfo.checkedAt;
        dl.appendChild(dtTime);
        dl.appendChild(ddTime);

        const dtMode = document.createElement('dt');
        dtMode.textContent = 'engine.mode';
        const ddMode = document.createElement('dd');
        ddMode.textContent = safeInfo['engine.mode'];
        dl.appendChild(dtMode);
        dl.appendChild(ddMode);

        const dtCode = document.createElement('dt');
        dtCode.textContent = 'engine.code';
        const ddCode = document.createElement('dd');
        ddCode.textContent = safeInfo['engine.code'];
        dl.appendChild(dtCode);
        dl.appendChild(ddCode);

        diagSection.appendChild(dl);

        const copyNotice = document.createElement('p');
        copyNotice.className = 'muted';
        copyNotice.textContent = '이 정보는 도움 요청에 쓰도록 복사하는 진단 정보입니다. (비밀번호나 인증 토큰은 포함되지 않습니다)';
        diagSection.appendChild(copyNotice);

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn';
        copyBtn.textContent = '도움정보 복사';

        const copyStatus = document.createElement('span');
        copyStatus.className = 'muted';
        copyStatus.style.marginLeft = '8px';

        copyBtn.addEventListener('click', async () => {
          const textToCopy = JSON.stringify(safeInfo, null, 2);
          try {
            if (navigator?.clipboard?.writeText) {
              await navigator.clipboard.writeText(textToCopy);
              copyStatus.textContent = '도움정보를 클립보드에 복사했습니다.';
            } else {
              copyStatus.textContent = '클립보드 API를 지원하지 않는 환경입니다.';
            }
          } catch {
            copyStatus.textContent = '복사에 실패했습니다.';
          }
        });

        const btnRow = document.createElement('div');
        btnRow.className = 'row';
        btnRow.style.alignItems = 'center';
        btnRow.appendChild(copyBtn);
        btnRow.appendChild(copyStatus);
        diagSection.appendChild(btnRow);
      }
      root.appendChild(diagSection);

      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
