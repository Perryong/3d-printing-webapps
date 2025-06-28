
import React from 'react';
import { User, Code, Briefcase, GraduationCap } from 'lucide-react';

const aboutData = {
  name: "Perry",
  title: "Software Engineer",
  bio: "Currently working as a Software / Rationalization Engineer at Murata Electronics Singapore. I'm also pursuing a part‑time M.Sc. AI at NTU. My journey blends academic rigour with real‑world AI applications.",
  skills: [
    "Software Engineering",
    "AI/Machine Learning",
    "Process Rationalization",
    "Python",
    "JavaScript/TypeScript",
    "React",
    "Data Analysis",
    "Algorithm Design"
  ],
  experience: [
    {
      company: "Murata Electronics Singapore",
      role: "Software / Rationalization Engineer",
      duration: "Present",
      description: "Working on software development and process optimization, applying engineering principles to streamline operations and improve efficiency."
    }
  ],
  education: [
    {
      institution: "Nanyang Technological University (NTU)",
      degree: "Master of Science in Artificial Intelligence (Part-time)",
      year: "In Progress"
    }
  ]
};

const AboutMe: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{aboutData.name}</h1>
            <p className="text-xl text-blue-600">{aboutData.title}</p>
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed">{aboutData.bio}</p>
      </div>

      {/* Skills Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Code className="w-6 h-6 text-blue-600" />
          Skills & Expertise
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {aboutData.skills.map((skill, index) => (
            <div
              key={index}
              className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>

      {/* Experience Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-blue-600" />
          Professional Experience
        </h2>
        <div className="space-y-6">
          {aboutData.experience.map((exp, index) => (
            <div key={index} className="border-l-4 border-blue-600 pl-6">
              <h3 className="text-lg font-semibold text-gray-900">{exp.role}</h3>
              <p className="text-blue-600 font-medium">{exp.company}</p>
              <p className="text-sm text-gray-500 mb-2">{exp.duration}</p>
              <p className="text-gray-700">{exp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Education Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          Education
        </h2>
        <div className="space-y-4">
          {aboutData.education.map((edu, index) => (
            <div key={index} className="border-l-4 border-green-500 pl-6">
              <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
              <p className="text-green-600 font-medium">{edu.institution}</p>
              <p className="text-sm text-gray-500">{edu.year}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutMe;
