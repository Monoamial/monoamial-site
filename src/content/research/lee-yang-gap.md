---
title: "Two gaps in the Ising model"
description: "How the distance to a complex zero of the partition function controls the length scale of correlations—and the proof detour that made the comparison work."
date: 2026-09-23
status: "preprint"
coauthors: ["Jui-Hui Chung", "Jacob Shapiro"]
tags:
  - mathematical-physics
  - Ising-model
  - Lee-Yang-zeros
link: "https://arxiv.org/abs/2609.25348"
---

Imagine a small magnet at every point of a square lattice, each pointing up or down. Neighbouring magnets prefer to agree, while temperature introduces disorder. This is the **Ising model**: a simple system in which local interactions produce a collective phase transition.

In a finite region $\Lambda\subset\mathbb Z^2$, a configuration consists of spins $\sigma_x\in\{-1,+1\}$. Its probability is proportional to

$$
\exp\!\left(\beta\sum_{\langle x,y\rangle\subset\Lambda}\sigma_x\sigma_y
+\beta h\sum_{x\in\Lambda}\sigma_x\right).
$$

Here $\beta$ is inverse temperature, $h$ is an external magnetic field, and the first sum runs over nearest neighbours. We set the interaction strength to one. The **partition function** $Z_{\beta,\Lambda}(h)$ is the sum of these weights over all configurations; dividing by it turns weights into probabilities. We use free boundaries: only edges with both endpoints in $\Lambda$ contribute.

At zero field and high temperature, $\beta<\beta_c$, there is no preferred direction, and distant spins become almost independent. At low temperature, $\beta>\beta_c$, the infinite system has two ordered phases, with positive or negative spontaneous magnetization. At $\beta_c=\tfrac12\log(1+\sqrt2)$, correlations reach across all scales. Our question concerns approaching this transition from the high-temperature side. [Onsager, 1944](https://doi.org/10.1103/PhysRev.65.117).

## Two ways to measure distance from criticality

The **connected correlation**

$$
G_\beta(x,y)=\langle\sigma_x\sigma_y\rangle_\beta
-\langle\sigma_x\rangle_\beta\langle\sigma_y\rangle_\beta
$$

measures how much two spins fluctuate together. In our zero-field, high-temperature setting, the individual means vanish. Correlations decay exponentially, and their decay rate along a lattice axis defines the **mass gap**:

$$
m_\beta=-\lim_{n\to\infty}\frac1n\log G_\beta(0,(n,0)),
\qquad \xi_\beta=\frac1{m_\beta}.
$$

The correlation length $\xi_\beta$ measures how far a spin's influence extends. As criticality approaches, $\xi_\beta$ diverges and $m_\beta$ vanishes.

The second gap comes from allowing $h$ to be complex. For real $h$, every statistical weight is positive, so $Z$ cannot vanish. For complex $h$, the weights can cancel. The **Lee–Yang theorem** places all these zeros on the imaginary field axis—or on the unit circle in the variable $z=e^{-2\beta h}$. [Lee–Yang, 1952](https://doi.org/10.1103/PhysRev.87.410).

For the free square boxes $\Lambda_L=[-L,L]^2\cap\mathbb Z^2$, define

$$
\mathcal L_\beta=\inf_{L\geq0}\inf\{s>0:Z_{\beta,\Lambda_L}(is)=0\}.
$$

This **Lee–Yang gap** measures how close a zero can come to the physical point $h=0$, uniformly over these boxes. Thus one gap lives in space, through the decay of correlations; the other lives in the complex field plane. How precisely are they related?

## The quantum-mechanical intuition

For a local quantum Hamiltonian $H$, the Green function $(H-E)^{-1}(x,y)$ measures propagation between two locations. The **Combes–Thomas estimate** says that staying away from the spectrum forces this propagation to decay exponentially. For a nearest-neighbour lattice Schrödinger operator, a standard form is

$$
|(H-E)^{-1}(x,y)|\leq\frac{C}{\delta}
e^{-c\delta|x-y|},
\qquad \delta=\operatorname{dist}(E,\operatorname{spec}H),
\quad 0<\delta\leq1.
$$

One intuition behind the proof is to reweight space exponentially: locality makes a small reweighting a small perturbation, and the spectral distance keeps the inverse under control. [Combes–Thomas, 1973](https://doi.org/10.1007/BF01646473); [Aizenman–Warzel, 2015, §10.3](https://doi.org/10.1090/gsm/168).

We wanted an Ising analogue: could distance from the Lee–Yang zeros control the decay rate of spin correlations? Earlier work already linked suitable uniform zero-free regions to exponential decay. Our aim was a quantitative comparison of the two gaps. [Penrose–Lebowitz, 1974](https://doi.org/10.1007/BF01614239).

This was the subject of my [Bachelor's thesis at Princeton University](https://dataspace.princeton.edu/handle/88435/dsp01dv13zx56v), supervised by Jacob Shapiro in 2024. We posed the problem there without finding a satisfactory solution. Jacob and Jui-Hui Chung continued working on it and found a working approach in summer 2026.

## The comparison

Our paper, [*Comparing the Lee–Yang gap with the mass gap in the sub-critical planar Ising model*](https://arxiv.org/abs/2609.25348), proves the following.

**Theorem (Borgnia–Chung–Shapiro, Theorem 1.1, gap comparison).** For the nearest-neighbour ferromagnetic Ising model on $\mathbb Z^2$, with the zero-field mass and free-square Lee–Yang gap defined above, there are constants $c,C>0$ and $0<\beta_0<\beta_c$ such that

$$
\boxed{c\,\mathcal L_\beta^{8/15}\leq m_\beta
\leq C\,\mathcal L_\beta^{8/15}}
\qquad (\beta_0<\beta<\beta_c).
$$

So the gaps determine one another's scale near criticality. Whether their appropriately rescaled ratio converges to a single constant remains open.

The exponent has an intuitive origin. At criticality, spin correlations decay like distance to the power $-1/4$. In a square of side $R$, summing correlations over pairs gives magnetization variance of order $R^{15/4}$, hence typical fluctuations of order $R^{15/8}$. A field becomes significant when $\beta h$ times those fluctuations is of order one. Taking $R$ to be the correlation length predicts $\mathcal L_\beta\asymp\xi_\beta^{-15/8}=m_\beta^{15/8}$. This is a scaling heuristic; the theorem makes the comparison rigorous. [Wu, 1966](https://doi.org/10.1103/PhysRev.149.380); [our paper, §1](https://arxiv.org/abs/2609.25348).

## A shorter route, and why the proof changed

The initial approach used **Ursell functions**, or connected correlations of several spins. They remove contributions that split into independent groups; the two-spin Ursell function is just $G_\beta$. They are generated by derivatives of the logarithm of the partition function with respect to local fields.

The key input was the monotonicity statement in Theorem 1 of Camia–Jiang–Newman (CJN): at zero field, increasing any ferromagnetic coupling $J_e$ increases the signed even Ursell function,

$$
\frac{\partial}{\partial J_e}
\bigl[(-1)^{k-1}u_{2k}(x_1,\ldots,x_{2k})\bigr]\geq0.
$$

Here $J_e$ is the coefficient of $\sigma_x\sigma_y$ in the Gibbs exponent. [Camia–Jiang–Newman, 2023, Theorem 1](https://arxiv.org/abs/2207.12247).

With this input, differentiating in a coupling bounds a connected correlation by products of lower-order ones. Iterating gives a sum over trees whose edges carry square roots of two-point correlations. Their spatial decay then controls all Taylor coefficients of $\log Z$, producing a zero-free disk of the desired size. This shorter argument is recorded conditionally in [Appendix A of our paper](https://arxiv.org/abs/2609.25348).

But we found a flaw in the published proof of the monotonicity theorem: a stronger auxiliary sign assertion used in its induction fails. This invalidated that proof step, without disproving the monotonicity statement itself. We therefore needed a route that established our comparison independently of it. Appendix A explains the obstruction precisely.

## Bootstrapping from finite boxes

The replacement proof starts with boxes a sufficiently large multiple of the correlation length. Random-current estimates control magnetization fluctuations inside each box. A correlation inequality of Ding–Song–Sun, together with planar crossing estimates, controls how strongly the surrounding spins can affect it. [Ding–Song–Sun, 2023](https://arxiv.org/abs/2107.09243).

We then organize the interactions into connected groups of boxes. Weak boundary influence makes large groups rare; a sufficiently small complex field makes each group's contribution small. A finite-volume induction keeps each successive partition-function ratio close to 1 and bounded away from 0. Adding another box therefore cannot create a zero. This bootstraps control on the correlation-length scale to arbitrarily large free squares. [Our paper, §§4–5](https://arxiv.org/abs/2609.25348).

The resulting zero-free radius is at least a constant times $m_\beta^{15/8}$. The reverse bound comes from expressing the partition function through its Lee–Yang zeros and comparing the susceptibility—the sum of two-point correlations—with the critical magnetization. Together these give the theorem. [Our paper, §3](https://arxiv.org/abs/2609.25348).

We have recently also repaired the proof of Theorem 1 in CJN. I will leave the argument for a future update; work on this subject is ongoing.

I am particularly interested in the **random-field Ising model**, where each site feels its own random magnetic field. For a fixed realization, zeros in an additional uniform complex field need no longer lie on the imaginary axis. Understanding their geometry, and how their distance from the origin relates to correlation decay in the presence of disorder, is a direction I would like to pursue. [Our paper, §1](https://arxiv.org/abs/2609.25348).

---

**Paper:** Noam Borgnia, Jui-Hui Chung, and Jacob Shapiro, *Comparing the Lee–Yang gap with the mass gap in the sub-critical planar Ising model* (2026), [arXiv:2609.25348](https://arxiv.org/abs/2609.25348).
