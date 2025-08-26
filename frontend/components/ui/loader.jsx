// components/Loader.jsx
import React from "react";
import styled from "styled-components";

const Loader = ({ size = 260 }) => {
  return (
    <StyledWrapper style={{ "--loader-size": `${size}px` }}>
      <div className="loader-wrapper">
        <span className="loader-letter">G</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">r</span>
        <span className="loader-letter">a</span>
        <span className="loader-letter">t</span>
        <span className="loader-letter">i</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">g</span>

        {/* break to next line */}
        <span className="break" aria-hidden="true" />

        <span className="loader-letter">P</span>
        <span className="loader-letter">r</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">d</span>
        <span className="loader-letter">i</span>
        <span className="loader-letter">c</span>
        <span className="loader-letter">t</span>
        <span className="loader-letter">i</span>
        <span className="loader-letter">o</span>
        <span className="loader-letter">n</span>

        <div className="loader" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader-wrapper{
    position:relative;
    display:flex;
    flex-wrap:wrap;           /* allow wrapping */
    align-items:center;
    align-content:center;
    row-gap:2px;
    justify-content:center;
    text-align:center;
    width:var(--loader-size,180px);
    height:var(--loader-size,180px);
    font-family:"Inter",sans-serif;
    font-size:clamp(12px, calc(var(--loader-size) * 0.08), 28px);
    color:white;
    border-radius:50%;
    user-select:none;
  }

  /* full-row break inside flex */
  .break{
    flex-basis:100%;
    width:100%;
    height:2px;
  }

  .loader{
    position:absolute;
    inset:0;
    border-radius:50%;
    animation:loader-rotate 2s linear infinite;
    z-index:0;
  }

  @keyframes loader-rotate{
    0%{transform:rotate(90deg);box-shadow:0 10px 20px 0 #fff inset,0 20px 30px 0 #ad5fff inset,0 60px 60px 0 #471eec inset}
    50%{transform:rotate(270deg);box-shadow:0 10px 20px 0 #fff inset,0 20px 10px 0 #d60a47 inset,0 40px 60px 0 #311e80 inset}
    100%{transform:rotate(450deg);box-shadow:0 10px 20px 0 #fff inset,0 20px 30px 0 #ad5fff inset,0 60px 60px 0 #471eec inset}
  }

  .loader-letter{
    display:inline-block;
    opacity:.4;
    animation:loader-letter-anim 2s infinite;
    z-index:1;
    margin:0 1px;
  }

  /* delays; using nth-of-type so the .break doesn’t affect them */
  .loader-letter:nth-of-type(1){animation-delay:0s}
  .loader-letter:nth-of-type(2){animation-delay:.1s}
  .loader-letter:nth-of-type(3){animation-delay:.2s}
  .loader-letter:nth-of-type(4){animation-delay:.3s}
  .loader-letter:nth-of-type(5){animation-delay:.4s}
  .loader-letter:nth-of-type(6){animation-delay:.5s}
  .loader-letter:nth-of-type(7){animation-delay:.6s}
  .loader-letter:nth-of-type(8){animation-delay:.7s}
  .loader-letter:nth-of-type(9){animation-delay:.8s}
  .loader-letter:nth-of-type(10){animation-delay:.9s}
  .loader-letter:nth-of-type(11){animation-delay:1.0s}
  .loader-letter:nth-of-type(12){animation-delay:1.1s}
  .loader-letter:nth-of-type(13){animation-delay:1.2s}
  .loader-letter:nth-of-type(14){animation-delay:1.3s}
  .loader-letter:nth-of-type(15){animation-delay:1.4s}
  .loader-letter:nth-of-type(16){animation-delay:1.5s}
  .loader-letter:nth-of-type(17){animation-delay:1.6s}
  .loader-letter:nth-of-type(18){animation-delay:1.7s}
  .loader-letter:nth-of-type(19){animation-delay:1.8s}
  .loader-letter:nth-of-type(20){animation-delay:1.9s}

  @keyframes loader-letter-anim{
    0%,100%{opacity:.4; transform:translateY(0)}
    20%{opacity:1; transform:scale(1.15)}
    40%{opacity:.7; transform:translateY(0)}
  }
`;

export default Loader;
