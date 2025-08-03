import React, { useState } from "react";

const Signup = ({ onSignup, setSignup }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <button onClick={()=>setSignup(false)}>
        Login
      </button>
    </div>
  )
};

export default Signup;
