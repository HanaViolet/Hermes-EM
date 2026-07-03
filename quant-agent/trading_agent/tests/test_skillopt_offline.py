from pathlib import Path

from trading_agent.tools.skillopt import SkillLibrary, SkillOptimizer, Trajectory


def _bad_trajectory(run_id: str) -> Trajectory:
    return Trajectory(
        run_id=run_id,
        ticker="TEST",
        strategy="momentum",
        decision="buy",
        total_return_pct=-4.2,
        sharpe_ratio=-0.2,
        max_drawdown_pct=22.0,
        agent_attribution=[{"agent": "Critic", "issue": "missed overheating"}],
        lesson_zh="社交热度和传闻扩散后仍然追涨，情绪市场风险过高。",
        lesson_en="Social heat and rumor heat were elevated before a failed chase.",
    )


def test_skillopt_offline_rule_patch_is_validation_gated(tmp_path: Path):
    skill_path = tmp_path / "global_skill.md"
    skill_path.write_text("# Minimal Skill\n\nUse price momentum.\n", encoding="utf-8")
    optimizer = SkillOptimizer(
        library=SkillLibrary(skill_path),
        edit_budget=5,
        validation_ratio=0.4,
        random_seed=7,
    )
    trajectories = [_bad_trajectory(str(i)) for i in range(6)]

    result = optimizer.step(trajectories)

    assert result["updated"] is True
    assert result["reason"] == "validation_improved"
    updated_skill = skill_path.read_text(encoding="utf-8")
    assert "## SkillOpt Candidate Rule" in updated_skill
    assert "sentiment-market risk" in updated_skill
