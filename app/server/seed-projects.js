// Seeded studio project (fictional): outline and practice sessions drafted once with the studio AI
// (tools: scratchpad build-seed-projects) and frozen here so the demo dashboard starts with work in progress.
export const LONGTERM_STUDIO = {
  "spec": {
    "title": "Long-term data conversations",
    "goal": "Reps can answer \"Show me long-term data\" with the 81% maintenance figure, say clearly that it comes from an open-label extension, and keep safety in the conversation.",
    "audience": {
      "role": "derm_reps",
      "experience": "derolad",
      "notes": "They already know the core story; this module sharpens one hard conversation."
    },
    "sections": [
      {
        "lessons": 2,
        "minutes": 8,
        "quiz": 4,
        "practice": "chat",
        "practiceMinutes": 4
      },
      {
        "lessons": 2,
        "minutes": 10,
        "quiz": 5,
        "practice": "avatar",
        "practiceMinutes": 6
      }
    ],
    "materials": [
      "src-core",
      "src-messages",
      "src-objections"
    ],
    "willUpload": false,
    "videos": []
  },
  "outline": {
    "title": "Long-term data conversations",
    "objective": "Reps can answer \"Show me long-term data\" with the 81% maintenance figure, state clearly that it comes from an open-label extension, and keep safety in the conversation.",
    "notes": "Check that 81% and week 52 are quoted exactly and always labeled as open-label extension data, and that the safety wording matches the Core Product Summary. Confirm no lesson implies a comparison or a guarantee of lasting response, and have MLR approve the plain-language phrasing in the new section 2 opener.",
    "sections": [
      {
        "id": "s1",
        "title": "Building the long-term data answer",
        "goal": "Reps can give an accurate, balanced answer to \"Show me long-term data\" that acknowledges HS burden and is clear about the extension study.",
        "lessons": [
          {
            "id": "l1",
            "title": "What the long-term data actually says",
            "pillar": "product",
            "minutes": 8,
            "points": [
              "In the ZEN-HS 1 and ZEN-HS 2 studies at 16 weeks, 58% of patients reached clinical response vs 29% with placebo.",
              "Response was maintained through week 52 in 81% of week-16 responders.",
              "The 81% applies only to patients who were responders at week 16, not to all patients treated.",
              "The 52-week result comes from an open-label extension, so it is not a placebo-controlled result.",
              "Derolad is for adults with moderate-to-severe HS, and the long-term answer stays within that population."
            ],
            "methods": [
              "why",
              "chart",
              "callout",
              "check"
            ],
            "video": null
          },
          {
            "id": "l2",
            "title": "Answering \"Show me long-term data\"",
            "pillar": "objections",
            "minutes": 8,
            "points": [
              "Start by acknowledging the HS burden (pain, stigma, delayed diagnosis) and the physician's need for evidence over time.",
              "Share that 81% of week-16 responders maintained response through week 52 in the open-label extension.",
              "State clearly that it is an extension study, before the physician has to ask.",
              "Connect to the key message Control that lasts: more than half reached clinical response at week 16, and most responders kept it through one year.",
              "Never compare with a named product or promise that an individual patient will keep response."
            ],
            "methods": [
              "example",
              "dodont",
              "callout",
              "check"
            ],
            "video": null
          }
        ],
        "quiz": 4,
        "quizFocus": "Checks that reps know the 81% figure, that it refers to week-16 responders through week 52, and that it comes from an open-label extension.",
        "practice": {
          "mode": "chat",
          "minutes": 4,
          "focus": "A typed chat with a time-pressed dermatologist who asks \"Show me long-term data\"; the rep must acknowledge the burden of HS, share the 81% figure and state clearly that it is from an open-label extension."
        }
      },
      {
        "id": "s2",
        "title": "Keeping safety in the conversation",
        "goal": "Reps keep safety part of the long-term data discussion and handle follow-up questions within approved boundaries.",
        "lessons": [
          {
            "id": "l5",
            "title": "Saying \"open-label extension\" in plain words",
            "pillar": "messaging",
            "minutes": 5,
            "points": [
              "Say the term \"open-label extension\" out loud and early, instead of hiding it behind phrases like \"long-term follow-up\".",
              "Use the plain phrase \"extension study\" alongside it, as the Approved Objection Handler asks reps to be clear that it is an extension study.",
              "Link the wording to the exact figure: 81% of week-16 responders maintained response through week 52.",
              "Keep the explanation short and neutral, never using it to make the result sound stronger than it is, and send detailed design questions to Medical Information."
            ],
            "methods": [
              "dodont",
              "example",
              "check"
            ],
            "video": null
          },
          {
            "id": "l3",
            "title": "Pairing the benefit with safety",
            "pillar": "messaging",
            "minutes": 10,
            "points": [
              "When presenting the 81% figure, safety is part of the same conversation and not saved for later.",
              "The most common side effects were injection-site reactions (9%), upper respiratory infections (7%) and headache (5%).",
              "Screen for tuberculosis before starting, and do not use with live vaccines.",
              "Refer detailed safety questions to the full prescribing information or Medical Information.",
              "Mention monthly dosing and Zenetic Access Connect only after the burden of HS and the evidence have been addressed."
            ],
            "methods": [
              "why",
              "dodont",
              "example",
              "check"
            ],
            "video": null
          },
          {
            "id": "l4",
            "title": "Handling follow-up challenges",
            "pillar": "objections",
            "minutes": 10,
            "points": [
              "If the physician questions the open-label design, acknowledge it and restate that it is an extension study without overstating the result.",
              "If asked \"What about safety?\", share the most common side effects and the TB screening requirement.",
              "If asked for data beyond the materials, such as other timelines or numbers, do not improvise and offer a Medical Information request.",
              "Off-label or comparative questions are not answered; offer a Medical Information request instead.",
              "Close the conversation by confirming what the physician needs next, without pushing a commitment."
            ],
            "methods": [
              "example",
              "dodont",
              "callout",
              "check"
            ],
            "video": null
          }
        ],
        "quiz": 5,
        "quizFocus": "Checks that reps pair the benefit with the most common side effects and TB screening, and know when to refer to Medical Information.",
        "practice": {
          "mode": "avatar",
          "minutes": 6,
          "focus": "A spoken conversation with a skeptical dermatologist who challenges the extension design, then asks about safety and an off-label or comparative question; the rep must stay accurate, include safety and offer a Medical Information request."
        }
      }
    ]
  },
  "chat": [
    {
      "who": "ai",
      "text": "I proposed two sections: the first builds an accurate, compliant answer to the long-term data question (the 81% figure and its open-label extension context), and the second adds safety and handling tougher follow-ups. Each section has two lessons at the requested minutes, a quiz and a practice session, and no videos are used."
    },
    {
      "who": "user",
      "text": "Open section 2 with a short lesson on how to say \"open-label extension\" in plain words."
    },
    {
      "who": "ai",
      "text": "I added a short 5-minute lesson at the start of section 2 on saying \"open-label extension\" in plain words, and left everything else as it was. The materials give no formal definition of open-label, so the lesson only teaches clear, non-minimizing wording, and the plain-language phrasing needs MLR approval."
    }
  ],
  "practice": [
    {
      "section": "s1",
      "mode": "chat",
      "minutes": 4,
      "persona": "reyes",
      "objection": "longterm",
      "brief": "You have a short slot with a dermatologist who treats adults with moderate-to-severe HS. Acknowledge the burden of HS, answer the request for long-term data with the 81% figure, and say clearly that it comes from an open-label extension.",
      "opening": "I only have a few minutes today, so go ahead: show me long-term data on Derolad.",
      "criteria": [
        "Acknowledges the burden of HS (pain, stigma, delayed diagnosis) before discussing the product",
        "States that 81% of week-16 responders maintained response through week 52",
        "Says clearly that the figure comes from an open-label extension study",
        "Briefly mentions the most common side effects or TB screening so safety stays in the conversation"
      ]
    },
    {
      "section": "s2",
      "mode": "avatar",
      "minutes": 6,
      "persona": "blake",
      "objection": "longterm",
      "brief": "A skeptical dermatologist wants proof that the long-term data holds up. Stay accurate on the open-label extension, pair the benefit with safety, and offer a Medical Information request for anything beyond the approved materials.",
      "opening": "An open-label extension with no placebo group doesn't impress me, so why should I trust that 81% figure?",
      "criteria": [
        "Acknowledges the burden of HS and the doctor's concern without getting defensive",
        "Restates 81% of week-16 responders maintained response through week 52 and plainly says it is an open-label extension, not a controlled comparison",
        "Shares the most common side effects (injection-site reactions 9%, upper respiratory infections 7%, headache 5%) and the TB screening requirement when safety comes up",
        "Declines to answer off-label or comparative questions and offers a Medical Information request",
        "Refers detailed safety questions to the full prescribing information or Medical Information",
        "Never minimizes risk, overstates results or names other medicines"
      ]
    }
  ]
};
