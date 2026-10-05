# 내 쿠션 내놔!

[브라우저에서 플레이](https://oysterlab.github.io/cushion-quest/)

인트로 → Chapter 1 「성 아랫마을」 → Stage 1–5 및 보스로 이어지는 고양이 액션 게임입니다. PC 키보드와 모바일 터치 조작을 지원합니다.

- PC: ← → 이동, Z/Space 점프, X 길게 흡입·다시 X 발사, ↓+Z 내려가기, P 일시정지, M 소리
- 모바일: 이동 다이얼, 점프·흡입 버튼, 일시정지. 세로·가로·폴더블 화면 자동 배치
- 인트로: 화면 탭 또는 Z/Space/Enter로 진행, SKIP으로 건너뛰기

`site/`만 GitHub Pages에 배포합니다. 생성 원본·프롬프트·검수 캡처·ROM은 포함하지 않습니다. 스프라이트는 원본 크기와 투명도를 유지한 무손실 WebP, 게임 코드는 esbuild로 압축했습니다. 음악과 효과음은 Web Audio로 재생합니다. 모바일에서는 처음 조작할 때 소리가 활성화됩니다.

로컬 원본은 `recovery/intro-cutscene`, `recovery/chapter1`, `recovery/shared`입니다. 이 저장소가 원래 프로젝트의 `publishing/cushion-quest`에 위치할 때:

```sh
../../recovery/.venv/bin/python scripts/build.py
python3 -m http.server 8872 --directory site
```

`main`에 변경 사항을 push하면 Pages가 다시 배포됩니다. 현재 빌드의 파일 목록과 용량은 `build-report.json`에 기록됩니다.
